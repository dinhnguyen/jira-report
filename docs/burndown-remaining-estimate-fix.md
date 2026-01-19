# Burndown Chart: Remaining Estimate Fix

## Problem

Burndown chart using "remaining" calculation method showed incorrect baseline at sprint start. Used **current** `remainingEstimateSeconds` instead of **historical** values from when issues entered sprint.

**Impact:** Chart started from wrong total, making burndown inaccurate.

## Root Cause

In `buildIssueStateByDate()` (time-calculator.ts:639), code called:
```typescript
state.estimates.set(key, getEstimateValue(issue, calculationMethod));
```

`getEstimateValue()` returns current remaining estimate, not sprint-start value.

**Example:** Issue had 8h remaining at sprint start. Developer logged 2h work yesterday. Current remaining = 6h. Chart used 6h instead of 8h.

## Solution: Historical Reconstruction

Added `getHistoricalRemainingEstimate()` in changelog-parser.ts that reconstructs sprint-start remaining estimate by analyzing changelog history.

### Algorithm

```
For each issue:
  1. Get current remainingEstimateSeconds (baseline)
  2. Find all remainingEstimate changelog entries
  3. Sort chronologically (oldest → newest)
  4. Walk through changes:
     - If change AFTER sprint start: reverse it
     - If change BEFORE/AT sprint start: use that value
  5. Fallback: If no changelog, use current remaining
```

### Example

```
Issue: PROJ-123
Current remaining: 6h
Sprint start: Jan 10, 2026

Changelog:
- Jan 9:  8h → 10h  (Before sprint start)
- Jan 12: 10h → 8h  (During sprint - scope reduced)
- Jan 15: 8h → 6h   (During sprint - work logged)

Result: Sprint-start value = 10h ✓
```

## Implementation Changes

### File: lib/changelog-parser.ts
- Added `getHistoricalRemainingEstimate()` function
- Analyzes changelog to reconstruct remaining estimate at specific date
- Falls back to current value if no changelog exists

### File: lib/time-calculator.ts
- Modified `buildIssueStateByDate()` at Day 0 initialization
- For 'remaining' method: calls `getHistoricalRemainingEstimate(issue, sprintStartDate, current)`
- For 'original' method: uses existing `getEstimateValue()` (unchanged)
- Also handles mid-sprint issue additions with historical values

## Code Locations

- `lib/changelog-parser.ts:197-265` - Historical reconstruction function
- `lib/time-calculator.ts:636-653` - Sprint start initialization
- `lib/time-calculator.ts:658-677` - Mid-sprint additions

## Additional Fix: Total Estimate Calculation

**Second Bug Found:** Total estimate summary card used current remaining (Done issues = 0) instead of sprint-start total.

**Fix:**
- Modified `calculateTimeDataWithWorklogs` (line 1017-1033)
- Modified `calculateTimeDataWithHistory` (line 359-395)
- Updated `createTimelineWithHistory` return type to include `initialTotal`
- For 'remaining' method: use `initialTotal` from first day state
- For 'original' method: keep current behavior (sum of current original estimates)

## Testing Checklist

- [ ] Verify burndown starts from correct total at sprint start
- [ ] Check total estimate in summary card matches sprint-start total (not current)
- [ ] Verify Done issues don't reduce total estimate display
- [ ] Check issues with estimate changes during sprint
- [ ] Test issues with no changelog (should use current value)
- [ ] Validate mid-sprint additions use correct historical value
- [ ] Compare original vs remaining calculation methods

## Unresolved Questions

None.
