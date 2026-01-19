# Time Spent on Day Zero Fix

## Problem

Time spent on sprint start date (Day 0) showed non-zero values because the calculation included work logged BEFORE the sprint began.

**Example:**
- Sprint starts: Jan 10, 2026
- Issue had 8h logged on Jan 8 (before sprint)
- Day 0 incorrectly showed 8h time spent ❌
- Expected: Day 0 should show 0h ✓

## Root Cause

Two calculation paths had the bug:

### 1. Worklog-Based Calculation

**File:** `lib/time-calculator.ts:774-829` (`buildTimeSpentByDateFromWorklogs`)

**Bug:** Accumulated ALL worklogs "on or before" each date, including pre-sprint work
```typescript
// OLD (incorrect)
while (
  worklogIndex < sortedWorklogs.length &&
  new Date(sortedWorklogs[worklogIndex].started) <= endOfDay
) {
  cumulativeTimeSpent += sortedWorklogs[worklogIndex].timeSpentSeconds;
  worklogIndex++;
}
```

**Fix:** Filter worklogs to only include those logged ON OR AFTER sprint start
```typescript
// NEW (correct)
const sprintWorklogs = worklogs.filter(w => {
  const worklogDate = startOfDay(new Date(w.started)).getTime();
  return worklogDate >= sprintStartTime;
});
```

### 2. Fallback Logic (Changelog-Based)

**File:** `lib/time-calculator.ts:469-493` (`createTimelineWithHistory`)

**Bug:** Added current time spent if issue was updated before Day 0
```typescript
// OLD (incorrect)
if (issue?.fields.updated) {
  const updatedDate = startOfDay(parseISO(issue.fields.updated));
  if (updatedDate <= date) {
    timeSpentSeconds += issue.fields.timetracking?.timeSpentSeconds || 0;
  }
}
```

**Fix:** Skip Day 0 entirely + check work was logged AFTER sprint start
```typescript
// NEW (correct)
if (dayIndex > 0) {
  if (issue?.fields.updated) {
    const updatedDate = startOfDay(parseISO(issue.fields.updated));
    if (updatedDate <= date && updatedDate > startDate) {
      timeSpentSeconds += issue.fields.timetracking?.timeSpentSeconds || 0;
    }
  }
}
```

## Solution Summary

1. **Worklog filtering**: Only count worklogs logged during sprint (>= sprint start date)
2. **Day 0 skip**: In fallback logic, don't add time spent on Day 0
3. **Date range check**: Ensure work was logged after sprint start

## Expected Behavior After Fix

- **Day 0 (sprint start)**: Time spent = 0h (no work done yet)
- **Day 1**: Time spent = work logged on Day 0 + Day 1
- **Day N**: Cumulative time spent from sprint start to Day N

## Testing

Generate chart and verify:
1. First day of sprint shows 0h time spent
2. Time spent only includes work logged during sprint
3. Cumulative values increase correctly day by day

## Code Locations

- `lib/time-calculator.ts:774-829` - `buildTimeSpentByDateFromWorklogs()`
- `lib/time-calculator.ts:469-493` - Fallback logic in `createTimelineWithHistory()`
