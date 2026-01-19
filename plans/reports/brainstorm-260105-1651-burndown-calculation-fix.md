# Burndown Chart Calculation Fix - Brainstorm Report

**Date:** 2026-01-05
**Type:** Solution Design
**Status:** Ready for Implementation

---

## Problem Statement

### Current Issues
1. **Số liệu không khớp với Jira** - Total estimate và remaining work calculations incorrect
2. **Đường Remaining Work không đúng** - Red line (remaining work) not decreasing properly or increasing incorrectly
3. **Scope creep không được track** - Issues added mid-sprint treated as if they were there from day 1
4. **Estimate changes không phản ánh** - Changes to original estimates during sprint not reflected

### Context
- **Data available:** Full originalEstimate và remainingEstimate
- **Sprint behavior:** Scope creep happens (issues added mid-sprint), estimates change during sprint
- **User expectation:** Keep 2 methods (original vs remaining) but fix bugs

### Root Cause Analysis

#### Bug 1: Wrong Issue Filter (Line 128-131 in time-calculator.ts)
```typescript
const relevantIssues = issues.filter(issue => {
  const createdDate = parseISO(issue.fields.created);
  return createdDate <= date;  // ❌ WRONG: Uses issue created date
});
```
**Impact:** Issue created 6 months ago but added to sprint yesterday → counted in all past days

#### Bug 2: No Scope Creep Tracking
- All issues treated as if present from sprint start
- Total estimate static across timeline (should increase when issues added)
- Can't distinguish initial scope vs added issues

#### Bug 3: No Estimate Change Tracking
- When originalEstimate changes during sprint → not reflected in chart
- Jira API only returns current state, not historical changes

---

## Research Findings

### Jira API Capabilities

#### Option A: Changelog API (✅ Works on Jira Cloud)
**Endpoint:** `GET /rest/api/3/issue/{issueKey}?expand=changelog`

**What it provides:**
- Complete history of all field changes
- When Sprint field was modified (issue added/removed from sprint)
- When estimate fields were changed
- Timestamp for each change

**Pros:**
- Accurate tracking of when issues added to sprint
- Works on Jira Cloud (user's environment)
- Can track estimate changes over time

**Cons:**
- Need separate API call for each issue
- Higher API usage (can batch 100 issues per call using search endpoint)
- More complex parsing logic

#### Option B: GreenHopper Sprint Report API (❌ Jira Server/DC only)
**Endpoint:** `/rest/greenhopper/1.0/rapid/charts/sprintreport`

**NOT VIABLE** - User likely on Jira Cloud based on .env.local.example setup

#### Option C: Current Data Approximation (⚠️ Limited accuracy)
**Use existing fields without changelog:**
- `created` date - Not reliable for sprint add date
- `sprint` field array - Shows which sprints but not when added
- `resolutiondate` - Good for completion tracking

**Pros:**
- No extra API calls
- Simple implementation

**Cons:**
- Cannot accurately determine when issue added to sprint
- Cannot track estimate changes
- Approximations may still be wrong

### Recommended API Solution: Batched Changelog Fetch

Use search endpoint with changelog expansion:
```typescript
GET /rest/api/3/search?jql=sprint={sprintId}&expand=changelog
```

**Benefits:**
- Single API call per 100 issues (vs per issue)
- Complete history for scope creep tracking
- Estimate change tracking possible

**Sources:**
- [Jira Issue Changelog API](https://support.atlassian.com/jira/kb/how-to-analyze-the-history-or-changelog-of-an-issue-in-jira/)
- [Sprint Issues Added/Dropped](https://community.developer.atlassian.com/t/get-sprint-issues-added-dropped-through-api/76619)
- [Determining When Issue Added to Sprint](https://community.atlassian.com/forums/Jira-questions/Determine-when-an-issue-was-added-to-sprint/qaq-p/1136030)

---

## Proposed Solution: 3-Tier Approach

### Tier 1: Quick Fix (No Extra API Calls) ⚡ FASTEST
**Time to implement:** 30-60 minutes
**Accuracy:** 70-80%

#### Changes Required:
1. **Remove wrong issue filter** - Don't filter by created date
2. **Use sprint field** - If issue has sprint field, assume it was there from sprint start
3. **Fix remaining calculation:**
   ```typescript
   // Current (wrong):
   remainingWorkSeconds = timeEstimateSeconds - completedWorkSeconds

   // Fixed:
   remainingWorkSeconds = totalEstimateAtStart - completedWorkSeconds
   ```

4. **Fix scope tracking approximation:**
   - Issues where `created` date > sprint start = likely scope creep
   - Add these estimates on their creation date

#### Pros:
- Quick implementation
- No API changes needed
- Works immediately

#### Cons:
- Still approximations
- Won't catch old issues added to sprint later
- Won't track estimate changes

---

### Tier 2: Changelog Integration (Accurate) ✅ RECOMMENDED
**Time to implement:** 2-4 hours
**Accuracy:** 95-98%

#### Implementation Steps:

**1. Fetch Changelog Data**
```typescript
// In jira-client.ts
async getActiveSprintIssuesWithChangelog(boardId: string): Promise<JiraIssue[]> {
  const activeSprint = await this.getActiveSprint(boardId);
  if (!activeSprint) return [];

  const jql = `sprint = ${activeSprint.id}`;
  return this.getIssuesByJQLWithChangelog(jql);
}

async getIssuesByJQLWithChangelog(jql: string): Promise<JiraIssue[]> {
  const searchClient = axios.create({
    baseURL: `https://${this.domain}/rest/api/3`,
    auth: this.client.defaults.auth,
  });

  let allIssues: JiraIssue[] = [];
  let startAt = 0;

  while (hasMore) {
    const response = await searchClient.get('/search', {
      params: {
        jql,
        startAt,
        maxResults: 100,
        fields: 'summary,status,assignee,parent,timetracking,created,updated,resolutiondate,sprint',
        expand: 'changelog'  // ⭐ KEY ADDITION
      }
    });

    allIssues = allIssues.concat(response.data.issues);
    startAt += 100;
    hasMore = response.data.total > startAt;
  }

  return allIssues;
}
```

**2. Parse Changelog for Sprint Events**
```typescript
// In lib/changelog-parser.ts (new file)
interface SprintEvent {
  issueKey: string;
  eventDate: string;
  eventType: 'added' | 'removed';
  sprintId: number;
  sprintName: string;
}

interface EstimateChange {
  issueKey: string;
  changeDate: string;
  field: 'originalEstimate' | 'remainingEstimate';
  fromValue: number;
  toValue: number;
}

export function parseSprintChanges(
  issue: JiraIssue,
  targetSprintId: number
): SprintEvent[] {
  const events: SprintEvent[] = [];

  if (!issue.changelog?.histories) return events;

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      if (item.field === 'Sprint') {
        // Check if targetSprintId was added or removed
        const fromSprints = parseSprintIds(item.from);
        const toSprints = parseSprintIds(item.to);

        if (!fromSprints.includes(targetSprintId) &&
            toSprints.includes(targetSprintId)) {
          // Issue was ADDED to sprint
          events.push({
            issueKey: issue.key,
            eventDate: history.created,
            eventType: 'added',
            sprintId: targetSprintId,
            sprintName: extractSprintName(item.toString)
          });
        } else if (fromSprints.includes(targetSprintId) &&
                   !toSprints.includes(targetSprintId)) {
          // Issue was REMOVED from sprint
          events.push({
            issueKey: issue.key,
            eventDate: history.created,
            eventType: 'removed',
            sprintId: targetSprintId,
            sprintName: extractSprintName(item.fromString)
          });
        }
      }
    }
  }

  return events;
}

export function parseEstimateChanges(issue: JiraIssue): EstimateChange[] {
  const changes: EstimateChange[] = [];

  if (!issue.changelog?.histories) return changes;

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      if (item.field === 'Original Estimate' ||
          item.field === 'Remaining Estimate') {
        changes.push({
          issueKey: issue.key,
          changeDate: history.created,
          field: item.field === 'Original Estimate'
            ? 'originalEstimate'
            : 'remainingEstimate',
          fromValue: parseEstimateToSeconds(item.from),
          toValue: parseEstimateToSeconds(item.to)
        });
      }
    }
  }

  return changes;
}

function parseEstimateToSeconds(estimate: string): number {
  // Jira format: "2w 3d 4h 30m" → convert to seconds
  let totalSeconds = 0;
  const weeks = estimate.match(/(\d+)w/);
  const days = estimate.match(/(\d+)d/);
  const hours = estimate.match(/(\d+)h/);
  const minutes = estimate.match(/(\d+)m/);

  if (weeks) totalSeconds += parseInt(weeks[1]) * 5 * 8 * 3600;
  if (days) totalSeconds += parseInt(days[1]) * 8 * 3600;
  if (hours) totalSeconds += parseInt(hours[1]) * 3600;
  if (minutes) totalSeconds += parseInt(minutes[1]) * 60;

  return totalSeconds;
}
```

**3. Update Timeline Calculation**
```typescript
// In lib/time-calculator.ts - Enhanced version
export function calculateTimeDataWithHistory(
  issues: JiraIssue[],
  sprintStartDate: string,
  sprintEndDate: string,
  sprintId: number,
  calculationMethod: 'original' | 'remaining' = 'original'
): {
  totalEstimate: number;
  totalSpent: number;
  timeline: TimeData[];
} {
  // Parse all sprint events and estimate changes
  const sprintEvents: SprintEvent[] = [];
  const estimateChanges: EstimateChange[] = [];

  issues.forEach(issue => {
    sprintEvents.push(...parseSprintChanges(issue, sprintId));
    estimateChanges.push(...parseEstimateChanges(issue));
  });

  // Sort events by date
  sprintEvents.sort((a, b) =>
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  estimateChanges.sort((a, b) =>
    new Date(a.changeDate).getTime() - new Date(b.changeDate).getTime()
  );

  // Create timeline with actual scope changes
  const timeline = createTimelineWithHistory(
    issues,
    sprintStartDate,
    sprintEndDate,
    sprintEvents,
    estimateChanges,
    calculationMethod
  );

  // Calculate totals (current state)
  let totalEstimate = 0;
  issues.forEach(issue => {
    const timeTracking = issue.fields.timetracking;
    if (timeTracking) {
      if (calculationMethod === 'original') {
        totalEstimate += timeTracking.originalEstimateSeconds || 0;
      } else {
        const remainingAtStart =
          (timeTracking.remainingEstimateSeconds || 0) +
          (timeTracking.timeSpentSeconds || 0);
        totalEstimate += remainingAtStart;
      }
    }
  });

  const totalSpent = issues.reduce((sum, issue) =>
    sum + (issue.fields.timetracking?.timeSpentSeconds || 0), 0
  );

  return { totalEstimate, totalSpent, timeline };
}

function createTimelineWithHistory(
  issues: JiraIssue[],
  sprintStartDate: string,
  sprintEndDate: string,
  sprintEvents: SprintEvent[],
  estimateChanges: EstimateChange[],
  calculationMethod: 'original' | 'remaining'
): TimeData[] {
  const startDate = startOfDay(parseISO(sprintStartDate));
  const endDate = startOfDay(parseISO(sprintEndDate));
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
  const today = startOfDay(new Date());

  // Build issue state tracker - which issues exist on each date
  const issueStateByDate = new Map<string, Set<string>>();
  const estimateByDateByIssue = new Map<string, Map<string, number>>();

  // Initialize: No issues on sprint start
  dateRange.forEach(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    issueStateByDate.set(dateStr, new Set());
    estimateByDateByIssue.set(dateStr, new Map());
  });

  // Determine which issues were in sprint at start
  // (issues without "added" event or added before sprint start)
  const issuesAtStart = new Set<string>();
  issues.forEach(issue => {
    const addEvent = sprintEvents.find(
      e => e.issueKey === issue.key && e.eventType === 'added'
    );
    if (!addEvent || new Date(addEvent.eventDate) <= startDate) {
      issuesAtStart.add(issue.key);
    }
  });

  // Apply events to build state over time
  dateRange.forEach(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const issuesOnDate = issueStateByDate.get(dateStr)!;
    const estimatesOnDate = estimateByDateByIssue.get(dateStr)!;

    // Start with previous day's state (or initial state)
    if (date.getTime() === startDate.getTime()) {
      // First day: add initial issues
      issuesAtStart.forEach(key => {
        issuesOnDate.add(key);
        const issue = issues.find(i => i.key === key)!;
        const estimate = getEstimateValue(issue, calculationMethod);
        estimatesOnDate.set(key, estimate);
      });
    } else {
      // Copy previous day's state
      const prevDateStr = format(
        new Date(date.getTime() - 86400000),
        'yyyy-MM-dd'
      );
      const prevIssues = issueStateByDate.get(prevDateStr)!;
      const prevEstimates = estimateByDateByIssue.get(prevDateStr)!;

      prevIssues.forEach(key => issuesOnDate.add(key));
      prevEstimates.forEach((estimate, key) =>
        estimatesOnDate.set(key, estimate)
      );
    }

    // Apply events that happened on this date
    sprintEvents.forEach(event => {
      const eventDate = startOfDay(parseISO(event.eventDate));
      if (eventDate.getTime() === date.getTime()) {
        if (event.eventType === 'added') {
          issuesOnDate.add(event.issueKey);
          const issue = issues.find(i => i.key === event.issueKey)!;
          const estimate = getEstimateValue(issue, calculationMethod);
          estimatesOnDate.set(event.issueKey, estimate);
        } else if (event.eventType === 'removed') {
          issuesOnDate.delete(event.issueKey);
          estimatesOnDate.delete(event.issueKey);
        }
      }
    });

    // Apply estimate changes that happened on this date
    estimateChanges.forEach(change => {
      const changeDate = startOfDay(parseISO(change.changeDate));
      if (changeDate.getTime() === date.getTime() &&
          issuesOnDate.has(change.issueKey)) {
        // Only update if using the field that changed
        if ((calculationMethod === 'original' &&
             change.field === 'originalEstimate') ||
            (calculationMethod === 'remaining' &&
             change.field === 'remainingEstimate')) {
          estimatesOnDate.set(change.issueKey, change.toValue);
        }
      }
    });
  });

  // Build timeline data points
  const timeline: TimeData[] = [];

  dateRange.forEach((date, dayIndex) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isFutureDate = date > today;
    const issuesOnDate = issueStateByDate.get(dateStr)!;
    const estimatesOnDate = estimateByDateByIssue.get(dateStr)!;

    // Calculate total estimate on this date
    let totalEstimateOnDate = 0;
    estimatesOnDate.forEach(estimate => {
      totalEstimateOnDate += estimate;
    });

    // Calculate completed work up to this date
    let completedWorkSeconds = 0;
    let issuesCompleted = 0;

    if (!isFutureDate) {
      issues.forEach(issue => {
        if (issue.fields.resolutiondate) {
          const resolvedDate = startOfDay(
            parseISO(issue.fields.resolutiondate)
          );
          if (resolvedDate <= date && issuesOnDate.has(issue.key)) {
            const estimate = estimatesOnDate.get(issue.key) || 0;
            completedWorkSeconds += estimate;
            issuesCompleted++;
          }
        }
      });
    }

    // Remaining work = Total on date - Completed
    const remainingWorkSeconds = isFutureDate
      ? 0
      : totalEstimateOnDate - completedWorkSeconds;

    // Ideal line: Linear decrease from initial total
    const initialTotal = Array.from(
      estimateByDateByIssue.get(format(startDate, 'yyyy-MM-dd'))!.values()
    ).reduce((sum, val) => sum + val, 0);

    const totalSprintDays = dateRange.length - 1;
    const idealRemainingSeconds = totalSprintDays > 0
      ? initialTotal * (1 - dayIndex / totalSprintDays)
      : 0;

    timeline.push({
      date: dateStr,
      timeSpentSeconds: 0, // Can calculate from timetracking if needed
      timeEstimateSeconds: totalEstimateOnDate,
      remainingWorkSeconds,
      idealRemainingSeconds,
      ratio: totalEstimateOnDate > 0
        ? (completedWorkSeconds / totalEstimateOnDate) * 100
        : 0,
      issuesCompleted,
      totalIssues: issuesOnDate.size
    });
  });

  return timeline;
}

function getEstimateValue(
  issue: JiraIssue,
  method: 'original' | 'remaining'
): number {
  const tracking = issue.fields.timetracking;
  if (!tracking) return 0;

  if (method === 'original') {
    return tracking.originalEstimateSeconds || 0;
  } else {
    return (tracking.remainingEstimateSeconds || 0) +
           (tracking.timeSpentSeconds || 0);
  }
}
```

**4. Update Types**
```typescript
// In types/jira.ts
export interface JiraIssue {
  // ... existing fields ...
  changelog?: {
    startAt: number;
    maxResults: number;
    total: number;
    histories: Array<{
      id: string;
      created: string;
      items: Array<{
        field: string;
        fieldtype: string;
        from: string;
        fromString: string;
        to: string;
        toString: string;
      }>;
    }>;
  };
}
```

**5. Wire Up in API Route**
```typescript
// In app/api/burndown/route.ts
import { calculateTimeDataWithHistory } from '@/lib/time-calculator';

// ... in POST handler ...
const client = new JiraClient(jiraDomain, jiraEmail, jiraApiToken);

for (const boardId of boardIds) {
  const activeSprint = await client.getActiveSprint(boardId);
  if (activeSprint) {
    // Use new method with changelog
    const issues = await client.getActiveSprintIssuesWithChangelog(boardId);

    allIssues.push(...issues);

    // Store sprint ID for later use
    sprintInfo.push({
      boardId,
      sprintId: activeSprint.id,  // ADD THIS
      sprintName: activeSprint.name,
      startDate: activeSprint.startDate,
      endDate: activeSprint.endDate,
    });
  }
}

// Use enhanced calculation
const timeData = calculateTimeDataWithHistory(
  allIssues,
  earliestSprintStart!,
  latestSprintEnd!,
  sprintInfo[0].sprintId,  // Assuming single sprint for now
  calculationMethod || 'original'
);
```

#### Pros:
- ✅ Accurate scope creep tracking
- ✅ Estimate change detection
- ✅ Works on Jira Cloud
- ✅ Proper timeline reconstruction

#### Cons:
- More complex implementation
- Slightly higher API usage (but still reasonable)
- Need to handle changelog parsing edge cases

---

### Tier 3: Manual Initial Scope Entry (Hybrid) 🎯 PRAGMATIC
**Time to implement:** 1-2 hours
**Accuracy:** 90-95%

#### Approach:
Combine Tier 1's simplicity with user input for accuracy

**UI Enhancement:**
```tsx
// In components/BoardSelector.tsx
const [initialScopeEstimate, setInitialScopeEstimate] = useState<number>(0);

<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Initial Sprint Estimate (optional, in hours)
  </label>
  <input
    type="number"
    value={initialScopeEstimate}
    onChange={(e) => setInitialScopeEstimate(Number(e.target.value))}
    placeholder="Leave empty to calculate from issues"
    className="..."
  />
  <p className="text-xs text-gray-500 mt-1">
    Enter total estimate at sprint start to track scope creep accurately
  </p>
</div>
```

**Calculation Enhancement:**
```typescript
// In time-calculator.ts
function calculateScopeCreep(
  issues: JiraIssue[],
  sprintStartDate: string,
  initialEstimate?: number
): number {
  if (!initialEstimate) return 0;

  const currentTotal = issues.reduce((sum, issue) =>
    sum + (issue.fields.timetracking?.originalEstimateSeconds || 0), 0
  );

  return currentTotal - (initialEstimate * 3600); // Convert hours to seconds
}
```

**Display in Chart:**
- Show "Initial Scope" line (gray dashed)
- Show "Current Scope" line (blue solid) if scope increased
- Remaining work calculated from initial scope

#### Pros:
- Quick to implement
- Accurate for scope creep if user provides initial estimate
- No complex changelog parsing
- Works immediately

#### Cons:
- Requires manual entry (but optional)
- Doesn't auto-detect when issues were added
- User must remember initial estimate

---

## Decision Matrix

| Feature | Tier 1 (Quick) | Tier 2 (Changelog) | Tier 3 (Hybrid) |
|---------|---------------|-------------------|----------------|
| **Accuracy** | 70-80% | 95-98% | 90-95% |
| **Implementation Time** | 30-60 min | 2-4 hours | 1-2 hours |
| **API Changes** | None | Moderate | Minimal |
| **User Effort** | None | None | Optional input |
| **Scope Creep Tracking** | ❌ Approximated | ✅ Exact | ✅ Good |
| **Estimate Changes** | ❌ No | ✅ Yes | ⚠️ Initial only |
| **Future Issues Added** | ❌ No | ✅ Yes | ⚠️ Via scope diff |
| **Maintenance** | ✅ Low | ⚠️ Medium | ✅ Low |

---

## Recommended Approach: Tier 2 → Tier 3 → Tier 1

### Phase 1: Implement Tier 2 (Changelog) - PRIMARY
**Why:** Most accurate, solves root cause, works on Jira Cloud

**Steps:**
1. Add changelog expansion to API calls
2. Create changelog parser module
3. Update calculation with historical state tracking
4. Test with real sprint data

**Estimated effort:** 3-4 hours

### Phase 2: Add Tier 3 (Manual Entry) - FALLBACK
**Why:** Provides immediate value while Tier 2 is being built, useful backup

**Steps:**
1. Add initial estimate input field
2. Calculate scope creep diff
3. Display in chart/summary

**Estimated effort:** 1 hour

### Phase 3: Keep Tier 1 as Emergency Fallback
**Why:** If API calls fail or rate limited, still show approximate data

**Already partially implemented** - just needs the filter fix

---

## Two Calculation Methods (Clarified)

### Method 1: "Original Estimate" (Fixed Baseline)
**Philosophy:** Track work against initial commitments

**Calculation:**
- **Total Estimate** = Sum of `originalEstimateSeconds` (current snapshot)
- **Completed** = Sum of `originalEstimateSeconds` for Done issues
- **Remaining** = Total - Completed
- **Scope Change** = Visible when total increases mid-sprint

**Best for:** Teams with stable scope, want to measure against original plan

**Chart behavior:**
- Ideal line: Linear from initial total to 0
- Remaining line: Decreases as work completes, increases if scope added
- Total estimate line: Shows scope creep visually

---

### Method 2: "Remaining Estimate" (Dynamic Tracking)
**Philosophy:** Track work based on current reality

**Calculation:**
- **Total Estimate** = Sum of `(remainingEstimate + timeSpent)` for each issue
- **Completed** = Sum of `(remainingEstimate + timeSpent)` for Done issues
- **Remaining** = Sum of `remainingEstimate` for incomplete issues
- **Scope Change** = Includes both added issues AND estimate increases

**Best for:** Teams that update estimates frequently, want real-time progress

**Chart behavior:**
- Ideal line: Linear from initial total to 0
- Remaining line: Tracks actual remaining (updated daily by team)
- More dynamic, reflects team's latest assessment

---

## Implementation Priority

1. **✅ Tier 2 (Changelog)** - Solves root cause, most accurate
2. **✅ Tier 3 (Manual)** - Quick win, user friendly
3. **⚠️ Tier 1 (Quick Fix)** - Only if time constrained

---

## Testing Strategy

### Test Scenarios
1. **Baseline:** Sprint with no scope changes → both methods should match
2. **Scope Creep:** Add issue mid-sprint → estimate should increase on that day
3. **Estimate Change:** Increase original estimate → should reflect in timeline
4. **Issue Completion:** Mark issue Done → remaining should decrease by exact amount
5. **Issue Removal:** Remove from sprint → estimate should decrease

### Test Data Requirements
- Sprint with known scope changes (document dates manually)
- Issues with estimate history
- Issues completed at different times

---

## Unresolved Questions

1. **Multiple boards with different sprints:** Current code assumes single sprint timeline - should we enforce same sprint or allow different timelines?

2. **Estimate format parsing:** Jira stores estimates as "2w 3d 4h" strings in changelog - need to handle all formats (workdays vs calendar days, hours per day config)

3. **Rate limiting:** Fetching changelog for 100+ issues could hit API limits - should we implement caching or progressive loading?

4. **Timezone handling:** Changelog timestamps are in UTC, sprint dates may be in local time - need consistent timezone handling

5. **Initial estimate capture:** Should we auto-save the first time chart is generated as "initial scope" for future comparisons?

---

## Success Metrics

✅ **Correct Numbers:**
- Total estimate matches Jira sprint report
- Completed work matches sum of Done issues
- Remaining = Total - Completed (always)

✅ **Correct Behavior:**
- Remaining line decreases when issues marked Done
- Remaining line increases when issues added mid-sprint
- Estimate changes reflected on the day they occurred

✅ **User Confidence:**
- Numbers match what users see in Jira
- Chart explains scope changes clearly
- Debug panel shows accurate calculations

---

## Next Steps

**After brainstorm approval:**

1. **Create implementation plan** - Use `/plan:hard` to create detailed step-by-step plan
2. **Setup test environment** - Prepare sprint data with known scope changes
3. **Implement Tier 2 (Changelog)** - Primary solution
4. **Add Tier 3 (Manual entry)** - Fallback/enhancement
5. **Testing & validation** - Verify against real Jira data
6. **Documentation update** - Update README with new calculation explanations

---

**Ready for planning?** Say "Yes" to create detailed implementation plan with `/plan:hard`
