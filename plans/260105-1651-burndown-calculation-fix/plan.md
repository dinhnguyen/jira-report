---
status: pending
created: 2026-01-05
type: bug-fix
priority: high
estimated_hours: 3-4
---

# Burndown Chart Calculation Fix - Implementation Plan

## Overview

Fix burndown chart calculation bugs by implementing Jira Changelog API integration to accurately track scope creep and estimate changes.

**Related:** `plans/reports/brainstorm-260105-1651-burndown-calculation-fix.md`

### Problems Fixed
1. ❌ Wrong issue filtering (using `created` date instead of sprint add date)
2. ❌ No scope creep tracking (issues added mid-sprint counted from sprint start)
3. ❌ Estimate changes not reflected in timeline

### Solution Approach
✅ **Tier 2: Changelog Integration** (Accuracy: 95-98%)
- Fetch issue changelog via Jira API
- Parse sprint field changes to track when issues added/removed
- Parse estimate changes to track value updates
- Rebuild timeline with accurate daily issue state

---

## Implementation Steps

### Phase 1: Extend Jira Client (30-45 min)

**File:** `lib/jira-client.ts`

**Task 1.1:** Add changelog expansion to API calls
```typescript
// Add new method
async getActiveSprintIssuesWithChangelog(boardId: string): Promise<JiraIssue[]> {
  const activeSprint = await this.getActiveSprint(boardId);
  if (!activeSprint) return [];

  const jql = `sprint = ${activeSprint.id}`;
  return this.getIssuesByJQLWithChangelog(jql, activeSprint.id);
}

// Update existing method to support changelog
async getIssuesByJQLWithChangelog(jql: string, sprintId?: number): Promise<JiraIssue[]> {
  const searchClient = axios.create({
    baseURL: `https://${this.domain}/rest/api/3`,  // v3 for changelog
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

**Validation:**
- [ ] API call returns issues with changelog field
- [ ] Console log shows changelog data structure
- [ ] No errors for sprints with 100+ issues

---

### Phase 2: Create Changelog Parser (45-60 min)

**New file:** `lib/changelog-parser.ts`

**Task 2.1:** Define interfaces
```typescript
export interface SprintEvent {
  issueKey: string;
  eventDate: string;
  eventType: 'added' | 'removed';
  sprintId: number;
}

export interface EstimateChange {
  issueKey: string;
  changeDate: string;
  field: 'originalEstimate' | 'remainingEstimate';
  fromValue: number;
  toValue: number;
}
```

**Task 2.2:** Implement sprint change parser
```typescript
export function parseSprintChanges(
  issue: JiraIssue,
  targetSprintId: number
): SprintEvent[] {
  const events: SprintEvent[] = [];

  if (!issue.changelog?.histories) return events;

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      if (item.field === 'Sprint') {
        const fromSprints = parseSprintIds(item.from);
        const toSprints = parseSprintIds(item.to);

        if (!fromSprints.includes(targetSprintId) &&
            toSprints.includes(targetSprintId)) {
          events.push({
            issueKey: issue.key,
            eventDate: history.created,
            eventType: 'added',
            sprintId: targetSprintId
          });
        } else if (fromSprints.includes(targetSprintId) &&
                   !toSprints.includes(targetSprintId)) {
          events.push({
            issueKey: issue.key,
            eventDate: history.created,
            eventType: 'removed',
            sprintId: targetSprintId
          });
        }
      }
    }
  }

  return events;
}

function parseSprintIds(sprintString: string): number[] {
  if (!sprintString) return [];
  // Sprint string format: "Sprint A[id=123],Sprint B[id=456]"
  const matches = sprintString.matchAll(/id=(\d+)/g);
  return Array.from(matches, m => parseInt(m[1]));
}
```

**Task 2.3:** Implement estimate change parser
```typescript
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
  if (!estimate) return 0;

  let totalSeconds = 0;
  const weeks = estimate.match(/(\d+)w/);
  const days = estimate.match(/(\d+)d/);
  const hours = estimate.match(/(\d+)h/);
  const minutes = estimate.match(/(\d+)m/);

  // Jira workday config: 1w = 5d, 1d = 8h
  if (weeks) totalSeconds += parseInt(weeks[1]) * 5 * 8 * 3600;
  if (days) totalSeconds += parseInt(days[1]) * 8 * 3600;
  if (hours) totalSeconds += parseInt(hours[1]) * 3600;
  if (minutes) totalSeconds += parseInt(minutes[1]) * 60;

  return totalSeconds;
}
```

**Validation:**
- [ ] Correctly parses sprint add/remove events
- [ ] Handles estimate format variations (w/d/h/m)
- [ ] Returns empty arrays when no changelog

---

### Phase 3: Update Time Calculator (60-90 min)

**File:** `lib/time-calculator.ts`

**Task 3.1:** Add new calculation function
```typescript
import { parseSprintChanges, parseEstimateChanges, SprintEvent, EstimateChange } from './changelog-parser';

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
  // Parse all events
  const sprintEvents: SprintEvent[] = [];
  const estimateChanges: EstimateChange[] = [];

  issues.forEach(issue => {
    sprintEvents.push(...parseSprintChanges(issue, sprintId));
    estimateChanges.push(...parseEstimateChanges(issue));
  });

  // Sort by date
  sprintEvents.sort((a, b) =>
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  estimateChanges.sort((a, b) =>
    new Date(a.changeDate).getTime() - new Date(b.changeDate).getTime()
  );

  // Build timeline
  const timeline = createTimelineWithHistory(
    issues,
    sprintStartDate,
    sprintEndDate,
    sprintEvents,
    estimateChanges,
    calculationMethod
  );

  // Calculate current totals
  let totalEstimate = 0;
  issues.forEach(issue => {
    const timeTracking = issue.fields.timetracking;
    if (timeTracking) {
      if (calculationMethod === 'original') {
        totalEstimate += timeTracking.originalEstimateSeconds || 0;
      } else {
        totalEstimate += (timeTracking.remainingEstimateSeconds || 0) +
                         (timeTracking.timeSpentSeconds || 0);
      }
    }
  });

  const totalSpent = issues.reduce((sum, issue) =>
    sum + (issue.fields.timetracking?.timeSpentSeconds || 0), 0
  );

  return { totalEstimate, totalSpent, timeline };
}
```

**Task 3.2:** Implement timeline builder with state tracking
```typescript
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

  // Build issue state: which issues exist on each date
  const issueStateByDate = buildIssueStateByDate(
    issues,
    dateRange,
    startDate,
    sprintEvents,
    estimateChanges,
    calculationMethod
  );

  // Generate timeline data points
  const timeline: TimeData[] = [];
  const totalSprintDays = dateRange.length - 1;

  // Get initial total for ideal line
  const firstDayState = issueStateByDate.get(format(startDate, 'yyyy-MM-dd'))!;
  const initialTotal = Array.from(firstDayState.estimates.values())
    .reduce((sum, val) => sum + val, 0);

  dateRange.forEach((date, dayIndex) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isFutureDate = date > today;
    const dayState = issueStateByDate.get(dateStr)!;

    // Calculate totals for this date
    let totalEstimateOnDate = 0;
    dayState.estimates.forEach(estimate => {
      totalEstimateOnDate += estimate;
    });

    // Calculate completed work
    let completedWorkSeconds = 0;
    let issuesCompleted = 0;

    if (!isFutureDate) {
      issues.forEach(issue => {
        if (issue.fields.resolutiondate &&
            dayState.issues.has(issue.key)) {
          const resolvedDate = startOfDay(parseISO(issue.fields.resolutiondate));
          if (resolvedDate <= date) {
            completedWorkSeconds += dayState.estimates.get(issue.key) || 0;
            issuesCompleted++;
          }
        }
      });
    }

    // Remaining = Total - Completed
    const remainingWorkSeconds = isFutureDate
      ? 0
      : totalEstimateOnDate - completedWorkSeconds;

    // Ideal line: Linear decrease
    const idealRemainingSeconds = totalSprintDays > 0
      ? initialTotal * (1 - dayIndex / totalSprintDays)
      : 0;

    timeline.push({
      date: dateStr,
      timeSpentSeconds: 0,
      timeEstimateSeconds: totalEstimateOnDate,
      remainingWorkSeconds,
      idealRemainingSeconds,
      ratio: totalEstimateOnDate > 0
        ? (completedWorkSeconds / totalEstimateOnDate) * 100
        : 0,
      issuesCompleted,
      totalIssues: dayState.issues.size
    });
  });

  return timeline;
}
```

**Task 3.3:** Implement state builder
```typescript
interface DayState {
  issues: Set<string>;
  estimates: Map<string, number>;
}

function buildIssueStateByDate(
  issues: JiraIssue[],
  dateRange: Date[],
  startDate: Date,
  sprintEvents: SprintEvent[],
  estimateChanges: EstimateChange[],
  calculationMethod: 'original' | 'remaining'
): Map<string, DayState> {
  const stateByDate = new Map<string, DayState>();

  // Determine initial issues (at sprint start or before)
  const issuesAtStart = new Set<string>();
  issues.forEach(issue => {
    const addEvent = sprintEvents.find(
      e => e.issueKey === issue.key && e.eventType === 'added'
    );
    if (!addEvent || new Date(addEvent.eventDate) <= startDate) {
      issuesAtStart.add(issue.key);
    }
  });

  // Build state for each date
  dateRange.forEach((date, index) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const state: DayState = {
      issues: new Set(),
      estimates: new Map()
    };

    // Start with previous day or initial state
    if (index === 0) {
      issuesAtStart.forEach(key => {
        state.issues.add(key);
        const issue = issues.find(i => i.key === key)!;
        state.estimates.set(key, getEstimateValue(issue, calculationMethod));
      });
    } else {
      const prevDateStr = format(
        new Date(date.getTime() - 86400000),
        'yyyy-MM-dd'
      );
      const prevState = stateByDate.get(prevDateStr)!;
      prevState.issues.forEach(key => state.issues.add(key));
      prevState.estimates.forEach((est, key) => state.estimates.set(key, est));
    }

    // Apply sprint events on this date
    sprintEvents.forEach(event => {
      const eventDate = startOfDay(parseISO(event.eventDate));
      if (eventDate.getTime() === date.getTime()) {
        if (event.eventType === 'added') {
          state.issues.add(event.issueKey);
          const issue = issues.find(i => i.key === event.issueKey)!;
          state.estimates.set(
            event.issueKey,
            getEstimateValue(issue, calculationMethod)
          );
        } else {
          state.issues.delete(event.issueKey);
          state.estimates.delete(event.issueKey);
        }
      }
    });

    // Apply estimate changes on this date
    estimateChanges.forEach(change => {
      const changeDate = startOfDay(parseISO(change.changeDate));
      if (changeDate.getTime() === date.getTime() &&
          state.issues.has(change.issueKey)) {
        const shouldUpdate =
          (calculationMethod === 'original' &&
           change.field === 'originalEstimate') ||
          (calculationMethod === 'remaining' &&
           change.field === 'remainingEstimate');

        if (shouldUpdate) {
          state.estimates.set(change.issueKey, change.toValue);
        }
      }
    });

    stateByDate.set(dateStr, state);
  });

  return stateByDate;
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

**Validation:**
- [ ] Timeline correctly shows issues added mid-sprint
- [ ] Remaining work decreases when issues completed
- [ ] Estimate changes reflected on correct dates
- [ ] Both calculation methods work correctly

---

### Phase 4: Update Types (10 min)

**File:** `types/jira.ts`

**Task 4.1:** Add changelog types
```typescript
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

**Validation:**
- [ ] TypeScript compilation succeeds
- [ ] No type errors in changelog parser

---

### Phase 5: Wire Up API Route (15 min)

**File:** `app/api/burndown/route.ts`

**Task 5.1:** Update API handler
```typescript
import { calculateTimeDataWithHistory } from '@/lib/time-calculator';

export async function POST(request: Request) {
  try {
    const { boardIds, domain, email, apiToken, calculationMethod } =
      await request.json();

    // ... validation ...

    const client = new JiraClient(jiraDomain, jiraEmail, jiraApiToken);

    const allIssues: JiraIssue[] = [];
    const sprintInfo: Array<{
      boardId: string;
      sprintId: number;
      sprintName: string;
      startDate?: string;
      endDate?: string
    }> = [];

    for (const boardId of boardIds) {
      const activeSprint = await client.getActiveSprint(boardId);
      if (activeSprint) {
        // Use new method with changelog
        const issues = await client.getActiveSprintIssuesWithChangelog(boardId);

        allIssues.push(...issues);
        sprintInfo.push({
          boardId,
          sprintId: activeSprint.id,
          sprintName: activeSprint.name,
          startDate: activeSprint.startDate,
          endDate: activeSprint.endDate,
        });

        // Track earliest/latest dates...
      }
    }

    if (allIssues.length === 0) {
      return NextResponse.json({
        totalEstimate: 0,
        totalSpent: 0,
        timeline: [],
        issueCount: 0,
        completedIssuesByDate: [],
        sprintInfo,
        message: 'No active sprints found'
      });
    }

    // Use enhanced calculation with history
    const timeData = calculateTimeDataWithHistory(
      allIssues,
      earliestSprintStart!,
      latestSprintEnd!,
      sprintInfo[0].sprintId,
      calculationMethod || 'original'
    );

    const completedIssuesByDate = getCompletedIssuesByDate(allIssues);

    return NextResponse.json({
      ...timeData,
      issueCount: allIssues.length,
      completedIssuesByDate,
      sprintInfo,
      sprintStartDate: earliestSprintStart,
      sprintEndDate: latestSprintEnd,
      allIssues,
    });
  } catch (error) {
    console.error('Error in burndown API:', error);
    return NextResponse.json(
      { error: 'Failed to calculate burndown data' },
      { status: 500 }
    );
  }
}
```

**Validation:**
- [ ] API returns correct data with changelog
- [ ] Error handling for missing changelog
- [ ] Console logs show parsing progress

---

### Phase 6: Testing & Validation (30-45 min)

**Test Scenarios:**

1. **Baseline Test**
   - Sprint with no scope changes
   - Both methods should show consistent results
   - Remaining line should decrease linearly

2. **Scope Creep Test**
   - Sprint with issues added mid-sprint
   - Total estimate should increase on add date
   - Remaining should reflect new work

3. **Estimate Change Test**
   - Sprint with estimate modifications
   - Timeline should show changes on correct dates

4. **Completion Test**
   - Mark issues Done at different times
   - Remaining should decrease by exact estimate amounts

5. **Mixed Scenario**
   - Combine all above scenarios
   - Verify final numbers match Jira

**Validation Checklist:**
- [ ] Total estimate matches Jira sprint report
- [ ] Completed work = sum of Done issue estimates
- [ ] Remaining = Total - Completed (always)
- [ ] Remaining line decreases on completion
- [ ] Remaining line increases on scope add
- [ ] Chart numbers match debug panel
- [ ] Both calculation methods work independently
- [ ] Console logs show correct event parsing

---

## Success Criteria

✅ **Correct Calculations**
- Total estimate matches Jira
- Remaining work accurately tracked
- Scope creep visible in timeline

✅ **Proper Behavior**
- Issues added mid-sprint counted from add date
- Estimate changes reflected on change date
- Completion reduces remaining by exact amount

✅ **User Confidence**
- Numbers match Jira reports
- Debug panel shows accurate breakdown
- Chart explains scope changes clearly

---

## Rollback Plan

If issues arise, can revert to old calculation:

1. Keep old `calculateTimeData` function as `calculateTimeDataLegacy`
2. Add setting toggle for "Use legacy calculation"
3. Switch between new/old based on toggle

---

## Known Limitations

1. **API v3 requirement:** Changelog only in v3, current code uses v1 (agile)
2. **Rate limiting:** 100 issues = 1 call (reasonable, but monitor)
3. **Estimate format:** Assumes Jira workday config (1d = 8h, 1w = 5d)
4. **Timezone:** Changelog timestamps UTC, need consistent handling
5. **Multiple sprints:** Current implementation assumes single sprint

---

## Next Steps After Implementation

1. Monitor API call performance
2. Add caching if rate limits hit
3. Consider Tier 3 (manual entry) as fallback
4. Update README with new calculation explanation
5. Add user documentation for scope tracking

---

## Files Modified

- ✏️ `lib/jira-client.ts` - Add changelog fetch
- ✏️ `lib/time-calculator.ts` - Add history-based calculation
- ➕ `lib/changelog-parser.ts` - New parser module
- ✏️ `types/jira.ts` - Add changelog types
- ✏️ `app/api/burndown/route.ts` - Wire up new calculation

---

## Estimated Timeline

- Phase 1: 30-45 min
- Phase 2: 45-60 min
- Phase 3: 60-90 min
- Phase 4: 10 min
- Phase 5: 15 min
- Phase 6: 30-45 min

**Total: 3-4 hours**
