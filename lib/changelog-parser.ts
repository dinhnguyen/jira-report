import { JiraIssue } from '@/types/jira';

/**
 * Represents a sprint event (issue added or removed from sprint)
 */
export interface SprintEvent {
  issueKey: string;
  eventDate: string;
  eventType: 'added' | 'removed';
  sprintId: number;
}

/**
 * Represents an estimate change event
 */
export interface EstimateChange {
  issueKey: string;
  changeDate: string;
  field: 'originalEstimate' | 'remainingEstimate';
  fromValue: number; // in seconds
  toValue: number; // in seconds
}

/**
 * Represents a time spent (worklog) change event
 */
export interface TimeSpentChange {
  issueKey: string;
  changeDate: string;
  fromValue: number; // in seconds
  toValue: number; // in seconds
  delta: number; // toValue - fromValue (positive = work logged)
}

/**
 * Parse sprint changes from issue changelog
 * Detects when an issue was added to or removed from a specific sprint
 */
export function parseSprintChanges(
  issue: JiraIssue,
  targetSprintId: number
): SprintEvent[] {
  const events: SprintEvent[] = [];

  if (!issue.changelog?.histories) {
    return events;
  }

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      if (item.field === 'Sprint') {
        const fromSprints = parseSprintIds(item.from || '');
        const toSprints = parseSprintIds(item.to || '');

        // Check if issue was added to target sprint
        if (!fromSprints.includes(targetSprintId) &&
            toSprints.includes(targetSprintId)) {
          events.push({
            issueKey: issue.key,
            eventDate: history.created,
            eventType: 'added',
            sprintId: targetSprintId
          });
        }
        // Check if issue was removed from target sprint
        else if (fromSprints.includes(targetSprintId) &&
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

/**
 * Parse estimate changes from issue changelog
 * Tracks changes to Original Estimate and Remaining Estimate fields
 */
export function parseEstimateChanges(issue: JiraIssue): EstimateChange[] {
  const changes: EstimateChange[] = [];

  if (!issue.changelog?.histories) {
    return changes;
  }

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      // Check for estimate field changes
      // Jira may use different field names: "timeoriginalestimate", "Original Estimate", etc.
      const fieldLower = item.field.toLowerCase();
      const isOriginalEstimate =
        fieldLower === 'original estimate' ||
        fieldLower === 'timeoriginalestimate';
      const isRemainingEstimate =
        fieldLower === 'remaining estimate' ||
        fieldLower === 'timeestimate';

      if (isOriginalEstimate || isRemainingEstimate) {
        const field = isOriginalEstimate
          ? 'originalEstimate'
          : 'remainingEstimate';

        const fromValue = parseEstimateToSeconds(item.fromString || item.from || '');
        const toValue = parseEstimateToSeconds(item.toString || item.to || '');

        // Debug first change for each issue
        if (changes.filter(c => c.issueKey === issue.key).length === 0) {
          console.log(`[Changelog Parser] ${issue.key} ${field} change: ${item.fromString || item.from || 'null'} → ${item.toString || item.to || 'null'} (${Math.round(fromValue/3600)}h → ${Math.round(toValue/3600)}h)`);
        }

        changes.push({
          issueKey: issue.key,
          changeDate: history.created,
          field,
          fromValue,
          toValue
        });
      }
    }
  }

  return changes;
}

/**
 * Parse time spent (worklog) changes from issue changelog
 * Tracks changes to Time Spent field when work is logged
 */
export function parseTimeSpentChanges(issue: JiraIssue): TimeSpentChange[] {
  const changes: TimeSpentChange[] = [];

  if (!issue.changelog?.histories) {
    return changes;
  }

  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      // Check for time spent field changes
      // Jira field names: "timespent", "Time Spent"
      const fieldLower = item.field.toLowerCase();
      const isTimeSpent =
        fieldLower === 'time spent' ||
        fieldLower === 'timespent';

      if (isTimeSpent) {
        const fromValue = parseEstimateToSeconds(item.fromString || item.from || '');
        const toValue = parseEstimateToSeconds(item.toString || item.to || '');
        const delta = toValue - fromValue;

        // Debug first change for each issue
        if (changes.filter(c => c.issueKey === issue.key).length === 0) {
          console.log(`[Changelog Parser] ${issue.key} timeSpent change: ${item.fromString || item.from || '0'} → ${item.toString || item.to || '0'} (${Math.round(fromValue/3600)}h → ${Math.round(toValue/3600)}h, delta: ${delta > 0 ? '+' : ''}${Math.round(delta/3600)}h)`);
        }

        changes.push({
          issueKey: issue.key,
          changeDate: history.created,
          fromValue,
          toValue,
          delta
        });
      }
    }
  }

  return changes;
}

/**
 * Parse sprint IDs from Jira sprint string format
 * Example: "Sprint A[id=123],Sprint B[id=456]" -> [123, 456]
 */
function parseSprintIds(sprintString: string): number[] {
  if (!sprintString || sprintString.trim() === '') {
    return [];
  }

  const ids: number[] = [];
  const regex = /id=(\d+)/g;
  let match;

  while ((match = regex.exec(sprintString)) !== null) {
    ids.push(parseInt(match[1], 10));
  }

  return ids;
}

/**
 * Reconstruct what an issue's remaining estimate was at a specific date
 * by analyzing changelog history and working backwards from current value
 *
 * @param issue - The Jira issue with changelog
 * @param targetDate - The date to reconstruct the estimate for (e.g., sprint start)
 * @param currentRemainingEstimate - Current remaining estimate value (fallback)
 * @returns The reconstructed remaining estimate in seconds
 */
export function getHistoricalRemainingEstimate(
  issue: JiraIssue,
  targetDate: Date,
  currentRemainingEstimate: number
): number {
  // Get all remaining estimate changes from changelog
  const changes = parseEstimateChanges(issue)
    .filter(c => c.field === 'remainingEstimate')
    .sort((a, b) => new Date(a.changeDate).getTime() - new Date(b.changeDate).getTime());

  // If no changelog, use current value (fallback)
  if (changes.length === 0) {
    return currentRemainingEstimate;
  }

  // Find the last change that happened on or before target date
  let reconstructedValue = currentRemainingEstimate;
  let foundHistoricalValue = false;

  // Walk through changes chronologically
  for (let i = changes.length - 1; i >= 0; i--) {
    const change = changes[i];
    const changeDate = new Date(change.changeDate);

    if (changeDate <= targetDate) {
      // This change happened on or before target date
      // Use the "toValue" from this change as the reconstructed value
      reconstructedValue = change.toValue;
      foundHistoricalValue = true;
      break;
    } else {
      // This change happened AFTER target date
      // We need to reverse it to reconstruct the historical value
      // Current logic: work backwards from current value
      if (!foundHistoricalValue) {
        // Reverse the change: if it went from X to Y, we need to go back to X
        const previousChange = i > 0 ? changes[i - 1] : null;
        if (previousChange) {
          reconstructedValue = previousChange.toValue;
        } else {
          // This was the first change, so before this change, the value was fromValue
          reconstructedValue = change.fromValue;
        }
      }
    }
  }

  // If all changes are after target date, use the fromValue of the first change
  if (!foundHistoricalValue && changes.length > 0) {
    const firstChange = changes[0];
    const firstChangeDate = new Date(firstChange.changeDate);

    if (firstChangeDate > targetDate) {
      // All changes are after target date, use fromValue of first change
      reconstructedValue = firstChange.fromValue;
      foundHistoricalValue = true;
    }
  }

  // Log reconstruction for debugging (first few issues only)
  const issueIndex = parseInt(issue.key.split('-')[1]) || 0;
  if (issueIndex % 100 === 0 || changes.length > 0) {
    console.log(
      `[Historical Estimate] ${issue.key}: ${Math.round(currentRemainingEstimate / 3600)}h (current) → ` +
      `${Math.round(reconstructedValue / 3600)}h (at ${targetDate.toISOString().split('T')[0]}) ` +
      `[${changes.length} changes, found=${foundHistoricalValue}]`
    );
  }

  return reconstructedValue;
}

/**
 * Parse Jira time estimate string to seconds
 * Supports two formats:
 * 1. Jira UI format: "2w 3d 4h 30m", "1d 2h", "45m"
 * 2. Raw seconds: "86400", "3600"
 * Assumptions: 1w = 5 workdays, 1d = 8 hours (Jira standard)
 */
function parseEstimateToSeconds(estimate: string): number {
  if (!estimate || estimate.trim() === '') {
    return 0;
  }

  const trimmed = estimate.trim();

  // Check if it's a raw number (seconds)
  // Jira changelog sometimes returns raw seconds like "86400" instead of "3d"
  if (/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Parse Jira UI format (e.g., "3d 4h 30m")
  let totalSeconds = 0;

  // Extract weeks
  const weeks = estimate.match(/(\d+)w/);
  if (weeks) {
    totalSeconds += parseInt(weeks[1], 10) * 5 * 8 * 3600; // 5 days * 8 hours * 3600 seconds
  }

  // Extract days
  const days = estimate.match(/(\d+)d/);
  if (days) {
    totalSeconds += parseInt(days[1], 10) * 8 * 3600; // 8 hours * 3600 seconds
  }

  // Extract hours
  const hours = estimate.match(/(\d+)h/);
  if (hours) {
    totalSeconds += parseInt(hours[1], 10) * 3600;
  }

  // Extract minutes
  const minutes = estimate.match(/(\d+)m/);
  if (minutes) {
    totalSeconds += parseInt(minutes[1], 10) * 60;
  }

  return totalSeconds;
}
