# Jira Working Days Calculation

## Standard Conversion

Jira uses configurable time tracking settings, with these default values:

- **1 working day** = 8 hours
- **1 week** = 5 working days = 40 hours

## Implementation

Added `secondsToWorkingDays()` function in `lib/time-calculator.ts`:

```typescript
export function secondsToWorkingDays(seconds: number): number {
  const HOURS_PER_DAY = 8;
  return Math.round((seconds / (HOURS_PER_DAY * 3600)) * 100) / 100;
}
```

## Display Changes

Updated components to show both hours and days side-by-side:

### Summary Cards (BurndownChart.tsx)
- **Total Work**: Shows hours and days
- **Completed**: Shows hours and days
- **Remaining**: Shows hours and days

Example: `24.5 hours | 3.1d`

### Chart Tooltip
Shows days in parentheses next to hours:
- Line values: `24.5h (3.1d)`
- Delta changes: `↓ 8.0h (1.0d): Completed work`

## References

- [Jira Time Tracking Documentation](https://support.atlassian.com/jira-software-cloud/docs/what-are-time-estimates-days-hours-minutes/)
- [Jira Working Days Configuration](https://support.atlassian.com/jira-software-cloud/docs/configure-working-days/)
- Default assumes 8-hour workday (standard in most Jira instances)

## Code Locations

- `lib/time-calculator.ts:239-247` - `secondsToWorkingDays()` function
- `components/BurndownChart.tsx:15` - Import statement
- `components/BurndownChart.tsx:119-120` - Total estimate calculation
- `components/BurndownChart.tsx:130-144` - Completed/remaining calculations
- `components/BurndownChart.tsx:180-220` - Summary card displays
- `components/BurndownChart.tsx:42-71` - Tooltip display
