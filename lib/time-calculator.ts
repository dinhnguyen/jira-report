import { JiraIssue, TimeData, CompletedIssuesByDate, WorklogsByIssue, DailyChangeSummary, DailyIssueChange } from '@/types/jira';
import { format, parseISO, eachDayOfInterval, startOfDay } from 'date-fns';
import {
  parseSprintChanges,
  parseEstimateChanges,
  parseTimeSpentChanges,
  getHistoricalRemainingEstimate,
  SprintEvent,
  EstimateChange,
  TimeSpentChange
} from './changelog-parser';

export function calculateTimeData(
  issues: JiraIssue[],
  sprintStartDate?: string,
  sprintEndDate?: string,
  calculationMethod: 'original' | 'remaining' = 'original'
): {
  totalEstimate: number;
  totalSpent: number;
  timeline: TimeData[];
} {
  if (issues.length === 0) {
    return {
      totalEstimate: 0,
      totalSpent: 0,
      timeline: [],
    };
  }

  // Calculate totals based on calculation method
  let totalEstimate = 0;
  let totalSpent = 0;

  // Calculate from issues
  issues.forEach(issue => {
    const timeTracking = issue.fields.timetracking;
    if (timeTracking) {
      // Use appropriate estimate field based on calculation method
      if (calculationMethod === 'original') {
        totalEstimate += timeTracking.originalEstimateSeconds || 0;
      } else {
        // For 'remaining' method: sum current remaining estimate
        // Jira sets remaining = 0 when Done, so this gives actual remaining work
        totalEstimate += timeTracking.remainingEstimateSeconds || 0;
      }
    }
  });

  // Calculate total spent (always from issues)
  issues.forEach(issue => {
    const timeTracking = issue.fields.timetracking;
    if (timeTracking) {
      totalSpent += timeTracking.timeSpentSeconds || 0;
    }
  });

  // Create timeline data
  const timeline = createTimeline(issues, sprintStartDate, sprintEndDate, calculationMethod);

  return {
    totalEstimate,
    totalSpent,
    timeline,
  };
}

function createTimeline(
  issues: JiraIssue[],
  sprintStartDate?: string,
  sprintEndDate?: string,
  calculationMethod: 'original' | 'remaining' = 'original'
): TimeData[] {
  if (issues.length === 0) return [];

  // Use sprint dates if provided, otherwise use issue creation dates
  let startDate: Date;
  let endDate: Date;

  if (sprintStartDate) {
    startDate = startOfDay(parseISO(sprintStartDate));
  } else {
    const dates = issues
      .map(issue => parseISO(issue.fields.created))
      .sort((a, b) => a.getTime() - b.getTime());
    startDate = startOfDay(dates[0]);
  }

  if (sprintEndDate) {
    // Use full sprint end date to show complete timeline
    endDate = startOfDay(parseISO(sprintEndDate));
  } else {
    endDate = startOfDay(new Date());
  }

  // Create daily intervals
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

  // Calculate total estimate at sprint start (all issues in sprint)
  const totalEstimateAtStart = issues.reduce((sum, issue) => {
    const timeTracking = issue.fields.timetracking;
    if (!timeTracking) return sum;

    if (calculationMethod === 'original') {
      return sum + (timeTracking.originalEstimateSeconds || 0);
    } else {
      // For 'remaining' method: sum current remaining
      // Note: This is current state, not historical sprint start
      return sum + (timeTracking.remainingEstimateSeconds || 0);
    }
  }, 0);

  // Calculate total sprint duration in days
  const totalSprintDays = dateRange.length - 1; // -1 because we count intervals

  // Calculate cumulative data for each day
  const timelineMap = new Map<string, TimeData>();

  const today = startOfDay(new Date());

  dateRange.forEach((date, dayIndex) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isFutureDate = date > today;

    // Filter issues that were created or updated by this date
    const relevantIssues = issues.filter(issue => {
      const createdDate = parseISO(issue.fields.created);
      return createdDate <= date;
    });

    let timeSpentSeconds = 0;
    let timeEstimateSeconds = 0;
    let completedWorkSeconds = 0;
    let issuesCompleted = 0;

    // Only calculate actual data for dates up to today
    if (!isFutureDate) {
      relevantIssues.forEach(issue => {
        const timeTracking = issue.fields.timetracking;
        if (timeTracking) {
          // For time spent, check if work was done by this date
          const updatedDate = parseISO(issue.fields.updated);
          if (updatedDate <= date) {
            timeSpentSeconds += timeTracking.timeSpentSeconds || 0;
          }

          // Track total estimate (including scope creep) based on calculation method
          if (calculationMethod === 'original') {
            timeEstimateSeconds += timeTracking.originalEstimateSeconds || 0;
          } else {
            // For 'remaining' method: use current remaining only
            timeEstimateSeconds += timeTracking.remainingEstimateSeconds || 0;
          }

          // Check if issue was completed by this date
          if (issue.fields.resolutiondate) {
            const resolvedDate = parseISO(issue.fields.resolutiondate);
            if (resolvedDate <= date) {
              // Use the same estimate field for completed work
              if (calculationMethod === 'original') {
                completedWorkSeconds += timeTracking.originalEstimateSeconds || 0;
              } else {
                // For remaining: when Done, remaining = 0, so completed = initial remaining
                // But we don't have historical remaining, so use originalEstimate as proxy
                completedWorkSeconds += timeTracking.originalEstimateSeconds || 0;
              }
            }
          }
        }

        // Check if issue was completed by this date
        if (issue.fields.resolutiondate) {
          const resolvedDate = parseISO(issue.fields.resolutiondate);
          if (resolvedDate <= date) {
            issuesCompleted++;
          }
        }
      });
    }

    // Remaining work calculation
    // For future dates, set to 0 so it won't be displayed
    let remainingWorkSeconds: number;
    if (isFutureDate) {
      remainingWorkSeconds = 0;
    } else {
      // Remaining = Total Estimate - Completed Work
      remainingWorkSeconds = timeEstimateSeconds - completedWorkSeconds;
    }

    // Ideal remaining = Linear decrease from total estimate to 0
    const idealRemainingSeconds = totalSprintDays > 0
      ? totalEstimateAtStart * (1 - dayIndex / totalSprintDays)
      : 0;

    // Debug logging for today's date
    if (dateStr === format(today, 'yyyy-MM-dd')) {
      console.log('\n=== TIME CALCULATOR DEBUG (Today) ===');
      console.log('Date:', dateStr);
      console.log('Is future date:', isFutureDate);
      console.log('Calculation method:', calculationMethod);
      console.log('Relevant issues:', relevantIssues.length);
      console.log('Time estimate (from issues):', timeEstimateSeconds, 's (', Math.round(timeEstimateSeconds / 3600), 'h)');
      console.log('Completed work (done issues):', completedWorkSeconds, 's (', Math.round(completedWorkSeconds / 3600), 'h)');
      console.log('Remaining work:', remainingWorkSeconds, 's (', Math.round(remainingWorkSeconds / 3600), 'h)');
      console.log('Ideal remaining:', idealRemainingSeconds, 's (', Math.round(idealRemainingSeconds / 3600), 'h)');
      console.log('Total estimate at start:', totalEstimateAtStart, 's (', Math.round(totalEstimateAtStart / 3600), 'h)');
      console.log('Issues completed:', issuesCompleted);
    }

    // Calculate ratio
    const baseEstimate = timeEstimateSeconds;
    const ratio = baseEstimate > 0
      ? (timeSpentSeconds / baseEstimate) * 100
      : 0;

    timelineMap.set(dateStr, {
      date: dateStr,
      timeSpentSeconds,
      timeEstimateSeconds: baseEstimate,
      remainingWorkSeconds,
      idealRemainingSeconds,
      ratio,
      issuesCompleted,
      totalIssues: relevantIssues.length,
    });
  });

  return Array.from(timelineMap.values());
}

export function secondsToHours(seconds: number): number {
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Convert seconds to Jira working days
 * Jira standard: 1 working day = 8 hours
 * @param seconds - Time in seconds
 * @returns Working days (rounded to 2 decimal places)
 */
export function secondsToWorkingDays(seconds: number): number {
  const HOURS_PER_DAY = 8;
  return Math.round((seconds / (HOURS_PER_DAY * 3600)) * 100) / 100;
}

export function formatTimeEstimate(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function getCompletedIssuesByDate(issues: JiraIssue[]): CompletedIssuesByDate[] {
  // Filter only completed issues
  const completedIssues = issues.filter(issue => issue.fields.resolutiondate);

  // Group by completion date
  const groupedByDate = new Map<string, CompletedIssuesByDate>();

  completedIssues.forEach(issue => {
    if (!issue.fields.resolutiondate) return;

    const completedDate = format(parseISO(issue.fields.resolutiondate), 'yyyy-MM-dd');

    if (!groupedByDate.has(completedDate)) {
      groupedByDate.set(completedDate, {
        date: completedDate,
        issues: [],
      });
    }

    const group = groupedByDate.get(completedDate)!;
    group.issues.push({
      key: issue.key,
      summary: issue.fields.summary,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      timeSpent: issue.fields.timetracking?.timeSpentSeconds || 0,
      completedDate,
    });
  });

  // Sort by date (newest first) and sort issues within each date
  return Array.from(groupedByDate.values())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(group => ({
      ...group,
      issues: group.issues.sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

/**
 * Calculate time data WITH changelog history for accurate scope creep tracking
 * This function uses issue changelog to determine when issues were added/removed
 * and when estimates changed during the sprint
 */
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
  if (issues.length === 0) {
    return {
      totalEstimate: 0,
      totalSpent: 0,
      timeline: [],
    };
  }

  console.log('\n=== CALCULATE WITH HISTORY ===');
  console.log('Sprint ID:', sprintId);
  console.log('Calculation method:', calculationMethod);
  console.log('Total issues:', issues.length);

  // Parse all sprint events, estimate changes, and time spent changes
  const sprintEvents: SprintEvent[] = [];
  const estimateChanges: EstimateChange[] = [];
  const timeSpentChanges: TimeSpentChange[] = [];

  issues.forEach(issue => {
    const events = parseSprintChanges(issue, sprintId);
    const changes = parseEstimateChanges(issue);
    const worklogChanges = parseTimeSpentChanges(issue);

    if (events.length > 0) {
      console.log(`${issue.key}: ${events.length} sprint events`);
    }
    if (changes.length > 0) {
      console.log(`${issue.key}: ${changes.length} estimate changes`);
    }
    if (worklogChanges.length > 0) {
      console.log(`${issue.key}: ${worklogChanges.length} worklog changes`);
    }

    sprintEvents.push(...events);
    estimateChanges.push(...changes);
    timeSpentChanges.push(...worklogChanges);
  });

  // Sort events by date
  sprintEvents.sort((a, b) =>
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  estimateChanges.sort((a, b) =>
    new Date(a.changeDate).getTime() - new Date(b.changeDate).getTime()
  );
  timeSpentChanges.sort((a, b) =>
    new Date(a.changeDate).getTime() - new Date(b.changeDate).getTime()
  );

  console.log(`Total sprint events: ${sprintEvents.length}`);
  console.log(`Total estimate changes: ${estimateChanges.length}`);
  console.log(`Total worklog changes: ${timeSpentChanges.length}`);

  // Warning if no worklog changes found
  if (timeSpentChanges.length === 0) {
    console.log('⚠️  WARNING: No worklog changes found in changelog');
    console.log('⚠️  Jira may not track Time Spent in changelog for your instance');
    console.log('⚠️  Falling back to current timeSpentSeconds values (less accurate)');
  }

  // Build timeline with historical state tracking
  const { timeline, initialTotal } = createTimelineWithHistory(
    issues,
    sprintStartDate,
    sprintEndDate,
    sprintEvents,
    estimateChanges,
    timeSpentChanges,
    calculationMethod
  );

  // Calculate totals for summary cards
  // For 'remaining' method: use sprint-start total (initialTotal)
  // For 'original' method: use current original estimates
  let totalEstimate = 0;
  if (calculationMethod === 'remaining') {
    // Use sprint-start total (already calculated with historical values)
    totalEstimate = initialTotal;
  } else {
    // For 'original' method, sum current original estimates
    issues.forEach(issue => {
      totalEstimate += getEstimateValue(issue, calculationMethod);
    });
  }

  const totalSpent = issues.reduce((sum, issue) =>
    sum + (issue.fields.timetracking?.timeSpentSeconds || 0), 0
  );

  console.log(`Final total estimate: ${totalEstimate}s (${Math.round(totalEstimate / 3600)}h)`);
  console.log(`Final total spent: ${totalSpent}s (${Math.round(totalSpent / 3600)}h)`);
  console.log(`Method: ${calculationMethod} (${calculationMethod === 'remaining' ? 'using sprint-start total' : 'using current totals'})`);

  return { totalEstimate, totalSpent, timeline };
}

/**
 * Internal helper: Build timeline with historical issue state tracking
 * Returns timeline data and initial total at sprint start
 */
function createTimelineWithHistory(
  issues: JiraIssue[],
  sprintStartDate: string,
  sprintEndDate: string,
  sprintEvents: SprintEvent[],
  estimateChanges: EstimateChange[],
  timeSpentChanges: TimeSpentChange[],
  calculationMethod: 'original' | 'remaining'
): { timeline: TimeData[]; initialTotal: number } {
  const startDate = startOfDay(parseISO(sprintStartDate));
  const endDate = startOfDay(parseISO(sprintEndDate));
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
  const today = startOfDay(new Date());

  // Build issue state: which issues exist on each date with their estimates and time spent
  const issueStateByDate = buildIssueStateByDate(
    issues,
    dateRange,
    startDate,
    sprintEvents,
    estimateChanges,
    timeSpentChanges,
    calculationMethod
  );

  // Get initial total for ideal line
  const firstDayState = issueStateByDate.get(format(startDate, 'yyyy-MM-dd'))!;
  const initialTotal = Array.from(firstDayState.estimates.values())
    .reduce((sum, val) => sum + val, 0);

  console.log(`Initial total at sprint start: ${initialTotal}s (${Math.round(initialTotal / 3600)}h)`);

  // Generate timeline data points
  const timeline: TimeData[] = [];
  const totalSprintDays = dateRange.length - 1;

  let previousRemaining = initialTotal;

  dateRange.forEach((date, dayIndex) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isFutureDate = date > today;
    const dayState = issueStateByDate.get(dateStr)!;

    // Calculate total estimate on this date
    let totalEstimateOnDate = 0;
    dayState.estimates.forEach(estimate => {
      totalEstimateOnDate += estimate;
    });

    // Calculate time spent and completed work up to this date
    let timeSpentSeconds = 0;
    let completedWorkSeconds = 0;
    let issuesCompleted = 0;

    if (!isFutureDate) {
      // Use historical time spent from dayState (from changelog)
      // If no changelog data, fall back to current values
      const hasWorklogChanges = timeSpentChanges.length > 0;

      dayState.issues.forEach(issueKey => {
        if (hasWorklogChanges) {
          // Use historical value from changelog
          timeSpentSeconds += dayState.timeSpent.get(issueKey) || 0;
        } else {
          // Fallback: use current timeSpentSeconds (approximation)
          // Skip Day 0 (sprint start) - no work done yet
          if (dayIndex > 0) {
            const issue = issues.find(i => i.key === issueKey);
            if (issue?.fields.resolutiondate) {
              const resolvedDate = startOfDay(parseISO(issue.fields.resolutiondate));
              if (resolvedDate <= date && resolvedDate > startDate) {
                // Issue done after sprint start: add full time spent
                timeSpentSeconds += issue.fields.timetracking?.timeSpentSeconds || 0;
              }
            } else if (issue?.fields.updated) {
              const updatedDate = startOfDay(parseISO(issue.fields.updated));
              if (updatedDate <= date && updatedDate > startDate) {
                // Issue updated after sprint start: add current time spent
                timeSpentSeconds += issue.fields.timetracking?.timeSpentSeconds || 0;
              }
            }
          }
        }
      });

      // Calculate completed work
      issues.forEach(issue => {
        if (dayState.issues.has(issue.key)) {
          if (issue.fields.resolutiondate) {
            const resolvedDate = startOfDay(parseISO(issue.fields.resolutiondate));
            if (resolvedDate <= date) {
              completedWorkSeconds += dayState.estimates.get(issue.key) || 0;
              issuesCompleted++;
            }
          }
        }
      });
    }

    // Remaining work calculation depends on method
    let remainingWorkSeconds: number;
    if (isFutureDate) {
      remainingWorkSeconds = 0;
    } else if (calculationMethod === 'remaining') {
      // Method = Remaining: Sum of remaining estimates from historical state
      // Use dayState.estimates which contains historical values from changelog
      remainingWorkSeconds = 0;
      dayState.issues.forEach(issueKey => {
        const issue = issues.find(i => i.key === issueKey);
        if (issue) {
          // Check if issue was completed by this date
          let estimateValue = dayState.estimates.get(issueKey) || 0;

          if (issue.fields.resolutiondate) {
            const resolvedDate = startOfDay(parseISO(issue.fields.resolutiondate));
            if (resolvedDate <= date) {
              // Issue done: remaining = 0
              estimateValue = 0;
            }
          }

          remainingWorkSeconds += estimateValue;
        }
      });
    } else {
      // Method = Original: Total - Completed
      remainingWorkSeconds = totalEstimateOnDate - completedWorkSeconds;
    }

    // Ideal line: Linear decrease from initial total
    const idealRemainingSeconds = totalSprintDays > 0
      ? initialTotal * (1 - dayIndex / totalSprintDays)
      : 0;

    // Calculate delta (change from previous day)
    const deltaSeconds = dayIndex === 0
      ? 0 // First day has no delta
      : remainingWorkSeconds - previousRemaining;

    // Build delta reason
    let deltaReason = '';
    if (!isFutureDate && dayIndex > 0) {
      if (deltaSeconds < 0) {
        deltaReason = `Completed work: ${Math.abs(Math.round(deltaSeconds / 3600))}h`;
      } else if (deltaSeconds > 0) {
        deltaReason = `Scope added: +${Math.round(deltaSeconds / 3600)}h`;
      } else {
        deltaReason = 'No change';
      }
    }

    // Debug logging for first 3 days and today
    if (dayIndex < 3 || dateStr === format(today, 'yyyy-MM-dd')) {
      console.log(`\n[Timeline ${dateStr}] Day ${dayIndex} (Method: ${calculationMethod}):`);
      console.log(`  Issues in sprint: ${dayState.issues.size}`);
      console.log(`  Total estimate: ${Math.round(totalEstimateOnDate / 3600)}h (${totalEstimateOnDate}s)`);
      console.log(`  Time spent (from changelog): ${Math.round(timeSpentSeconds / 3600)}h (${timeSpentSeconds}s)`);
      console.log(`  Completed work: ${Math.round(completedWorkSeconds / 3600)}h (${completedWorkSeconds}s)`);
      console.log(`  Remaining work: ${Math.round(remainingWorkSeconds / 3600)}h (${remainingWorkSeconds}s)`);
      if (calculationMethod === 'remaining') {
        console.log(`  → Remaining: Sum of remaining estimates (Done issues = 0)`);
      } else {
        console.log(`  → Remaining: Total estimate - Completed work`);
      }
      if (timeSpentChanges.length > 0) {
        console.log(`  → Time Spent: ✓ Historical values from worklog changelog`);
      } else {
        console.log(`  → Time Spent: ⚠️ Approximation from current values (no changelog)`);
      }
      console.log(`  Delta: ${deltaSeconds > 0 ? '+' : ''}${Math.round(deltaSeconds / 3600)}h (${deltaReason})`);
    }

    timeline.push({
      date: dateStr,
      timeSpentSeconds,
      timeEstimateSeconds: totalEstimateOnDate,
      remainingWorkSeconds,
      idealRemainingSeconds,
      ratio: totalEstimateOnDate > 0
        ? (completedWorkSeconds / totalEstimateOnDate) * 100
        : 0,
      issuesCompleted,
      totalIssues: dayState.issues.size,
      deltaSeconds,
      deltaReason
    });

    // Update previous for next iteration
    if (!isFutureDate) {
      previousRemaining = remainingWorkSeconds;
    }
  });

  return { timeline, initialTotal };
}

/**
 * Internal helper: Day state tracking structure
 */
interface DayState {
  issues: Set<string>;
  estimates: Map<string, number>;
  timeSpent: Map<string, number>; // Historical time spent for each issue
}

/**
 * Internal helper: Build issue state for each day
 * Tracks which issues are in the sprint, their estimate values, and time spent day by day
 */
function buildIssueStateByDate(
  issues: JiraIssue[],
  dateRange: Date[],
  startDate: Date,
  sprintEvents: SprintEvent[],
  estimateChanges: EstimateChange[],
  timeSpentChanges: TimeSpentChange[],
  calculationMethod: 'original' | 'remaining'
): Map<string, DayState> {
  const stateByDate = new Map<string, DayState>();

  // Determine which issues were in sprint at start
  // (issues without "added" event OR added before/on sprint start date)
  const issuesAtStart = new Set<string>();
  issues.forEach(issue => {
    const addEvent = sprintEvents.find(
      e => e.issueKey === issue.key && e.eventType === 'added'
    );

    if (!addEvent) {
      // No add event = was in sprint from beginning
      issuesAtStart.add(issue.key);
    } else if (new Date(addEvent.eventDate) <= startDate) {
      // Added before or on sprint start
      issuesAtStart.add(issue.key);
    }
  });

  console.log(`Issues at sprint start: ${issuesAtStart.size}/${issues.length}`);

  // Build state for each date
  dateRange.forEach((date, index) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const state: DayState = {
      issues: new Set(),
      estimates: new Map(),
      timeSpent: new Map()
    };

    // Initialize state
    if (index === 0) {
      // First day: add initial issues
      issuesAtStart.forEach(key => {
        state.issues.add(key);
        const issue = issues.find(i => i.key === key)!;

        // For 'remaining' method, use historical reconstruction to get sprint-start value
        let estimateValue: number;
        if (calculationMethod === 'remaining') {
          const currentRemaining = issue.fields.timetracking?.remainingEstimateSeconds || 0;
          estimateValue = getHistoricalRemainingEstimate(issue, date, currentRemaining);
        } else {
          // For 'original' method, use current original estimate
          estimateValue = getEstimateValue(issue, calculationMethod);
        }

        state.estimates.set(key, estimateValue);
        state.timeSpent.set(key, 0); // No time spent at sprint start
      });
    } else {
      // Copy previous day's state
      const prevDateStr = format(
        new Date(date.getTime() - 86400000),
        'yyyy-MM-dd'
      );
      const prevState = stateByDate.get(prevDateStr)!;
      prevState.issues.forEach(key => state.issues.add(key));
      prevState.estimates.forEach((est, key) => state.estimates.set(key, est));
      prevState.timeSpent.forEach((spent, key) => state.timeSpent.set(key, spent));
    }

    // Apply sprint events that happened on this date
    sprintEvents.forEach(event => {
      const eventDate = startOfDay(parseISO(event.eventDate));
      if (eventDate.getTime() === date.getTime()) {
        if (event.eventType === 'added') {
          state.issues.add(event.issueKey);
          const issue = issues.find(i => i.key === event.issueKey)!;

          // For 'remaining' method, use historical value at the time of addition
          let estimateValue: number;
          if (calculationMethod === 'remaining') {
            const currentRemaining = issue.fields.timetracking?.remainingEstimateSeconds || 0;
            estimateValue = getHistoricalRemainingEstimate(issue, date, currentRemaining);
          } else {
            estimateValue = getEstimateValue(issue, calculationMethod);
          }

          state.estimates.set(event.issueKey, estimateValue);
          state.timeSpent.set(event.issueKey, 0); // New issue has no time spent yet
          console.log(`[${dateStr}] Added ${event.issueKey} with estimate ${Math.round(estimateValue / 3600)}h`);
        } else if (event.eventType === 'removed') {
          state.issues.delete(event.issueKey);
          state.estimates.delete(event.issueKey);
          state.timeSpent.delete(event.issueKey);
          console.log(`[${dateStr}] Removed ${event.issueKey}`);
        }
      }
    });

    // Apply estimate changes that happened on this date
    estimateChanges.forEach(change => {
      const changeDate = startOfDay(parseISO(change.changeDate));
      if (changeDate.getTime() === date.getTime() &&
        state.issues.has(change.issueKey)) {
        // Only update if using the field that changed
        const shouldUpdate =
          (calculationMethod === 'original' && change.field === 'originalEstimate') ||
          (calculationMethod === 'remaining' && change.field === 'remainingEstimate');

        if (shouldUpdate) {
          const oldValue = state.estimates.get(change.issueKey) || 0;
          state.estimates.set(change.issueKey, change.toValue);
          console.log(`[${dateStr}] ${change.issueKey} estimate: ${Math.round(oldValue / 3600)}h → ${Math.round(change.toValue / 3600)}h`);
        }
      }
    });

    // Apply time spent changes that happened on this date
    timeSpentChanges.forEach(change => {
      const changeDate = startOfDay(parseISO(change.changeDate));
      if (changeDate.getTime() === date.getTime() &&
        state.issues.has(change.issueKey)) {
        const oldValue = state.timeSpent.get(change.issueKey) || 0;
        state.timeSpent.set(change.issueKey, change.toValue);
        console.log(`[${dateStr}] ${change.issueKey} timeSpent: ${Math.round(oldValue / 3600)}h → ${Math.round(change.toValue / 3600)}h (logged: ${Math.round(change.delta / 3600)}h)`);
      }
    });

    stateByDate.set(dateStr, state);
  });

  return stateByDate;
}

/**
 * Internal helper: Get estimate value based on calculation method
 */
function getEstimateValue(
  issue: JiraIssue,
  method: 'original' | 'remaining'
): number {
  const tracking = issue.fields.timetracking;
  if (!tracking) return 0;

  if (method === 'original') {
    return tracking.originalEstimateSeconds || 0;
  } else {
    // For remaining method: use current remaining estimate only
    // Jira automatically sets remaining = 0 when issue is Done
    return tracking.remainingEstimateSeconds || 0;
  }
}

/**
 * Build time spent by date map from worklogs
 * Returns cumulative time spent for each date WITHIN the sprint
 * Important: Only counts worklogs logged during the sprint period
 */
export function buildTimeSpentByDateFromWorklogs(
  worklogsByIssue: WorklogsByIssue[],
  dateRange: Date[]
): Map<string, Map<string, number>> {
  // Map: dateStr -> Map<issueKey, cumulativeTimeSpent>
  const timeSpentByDate = new Map<string, Map<string, number>>();

  // Get sprint start date (first date in range)
  const sprintStartDate = dateRange[0];
  const sprintStartTime = startOfDay(sprintStartDate).getTime();

  // Initialize all dates with empty maps
  dateRange.forEach(date => {
    timeSpentByDate.set(format(date, 'yyyy-MM-dd'), new Map());
  });

  // Sort worklogs by date for each issue
  worklogsByIssue.forEach(({ issueKey, worklogs }) => {
    // Filter worklogs to only include those logged ON OR AFTER sprint start
    const sprintWorklogs = worklogs.filter(w => {
      const worklogDate = startOfDay(new Date(w.started)).getTime();
      return worklogDate >= sprintStartTime;
    });

    // Sort worklogs by started date
    const sortedWorklogs = [...sprintWorklogs].sort(
      (a, b) => new Date(a.started).getTime() - new Date(b.started).getTime()
    );

    // Calculate cumulative time spent for each date (within sprint only)
    let cumulativeTimeSpent = 0;
    let worklogIndex = 0;

    dateRange.forEach(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Add worklogs that started on or before this date (but after/on sprint start)
      while (
        worklogIndex < sortedWorklogs.length &&
        new Date(sortedWorklogs[worklogIndex].started) <= endOfDay
      ) {
        cumulativeTimeSpent += sortedWorklogs[worklogIndex].timeSpentSeconds;
        worklogIndex++;
      }

      // Set cumulative time for this issue on this date
      const dateMap = timeSpentByDate.get(dateStr)!;
      dateMap.set(issueKey, cumulativeTimeSpent);
    });
  });

  return timeSpentByDate;
}

/**
 * Calculate time data with worklogs for accurate time spent tracking
 * Uses Jira Worklog API data instead of changelog for precise historical time tracking
 */
export function calculateTimeDataWithWorklogs(
  issues: JiraIssue[],
  sprintStartDate: string,
  sprintEndDate: string,
  sprintId: number,
  worklogsByIssue: WorklogsByIssue[],
  calculationMethod: 'original' | 'remaining' = 'original'
): {
  totalEstimate: number;
  totalSpent: number;
  timeline: TimeData[];
} {
  if (issues.length === 0) {
    return {
      totalEstimate: 0,
      totalSpent: 0,
      timeline: [],
    };
  }

  console.log('\n=== CALCULATE WITH WORKLOGS ===');
  console.log('Sprint ID:', sprintId);
  console.log('Calculation method:', calculationMethod);
  console.log('Total issues:', issues.length);
  console.log('Issues with worklogs:', worklogsByIssue.length);

  // Parse sprint events and estimate changes from changelog
  const sprintEvents: SprintEvent[] = [];
  const estimateChanges: EstimateChange[] = [];

  issues.forEach(issue => {
    const events = parseSprintChanges(issue, sprintId);
    const changes = parseEstimateChanges(issue);

    if (events.length > 0) {
      console.log(`${issue.key}: ${events.length} sprint events`);
    }
    if (changes.length > 0) {
      console.log(`${issue.key}: ${changes.length} estimate changes`);
    }

    sprintEvents.push(...events);
    estimateChanges.push(...changes);
  });

  // Sort events by date
  sprintEvents.sort((a, b) =>
    new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
  estimateChanges.sort((a, b) =>
    new Date(a.changeDate).getTime() - new Date(b.changeDate).getTime()
  );

  console.log(`Total sprint events: ${sprintEvents.length}`);
  console.log(`Total estimate changes: ${estimateChanges.length}`);

  // Build date range
  const startDate = startOfDay(parseISO(sprintStartDate));
  const endDate = startOfDay(parseISO(sprintEndDate));
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
  const today = startOfDay(new Date());

  // Build time spent by date from worklogs (accurate historical data!)
  const timeSpentByDate = buildTimeSpentByDateFromWorklogs(worklogsByIssue, dateRange);

  // Log sample worklog data
  const firstWorklogIssue = worklogsByIssue.find(w => w.worklogs.length > 0);
  if (firstWorklogIssue) {
    console.log(`Sample worklogs for ${firstWorklogIssue.issueKey}:`);
    firstWorklogIssue.worklogs.slice(0, 3).forEach(w => {
      console.log(`  ${format(parseISO(w.started), 'yyyy-MM-dd')}: ${w.timeSpent} (${w.timeSpentSeconds}s)`);
    });
  }

  // Build issue state for each day (for estimates and sprint membership)
  const issueStateByDate = buildIssueStateByDate(
    issues,
    dateRange,
    startDate,
    sprintEvents,
    estimateChanges,
    [], // Empty timeSpentChanges - we'll use worklogs instead
    calculationMethod
  );

  // Get initial total for ideal line
  const firstDayState = issueStateByDate.get(format(startDate, 'yyyy-MM-dd'))!;
  const initialTotal = Array.from(firstDayState.estimates.values())
    .reduce((sum, val) => sum + val, 0);

  console.log(`Initial total at sprint start: ${initialTotal}s (${Math.round(initialTotal / 3600)}h)`);

  // Generate timeline data points
  const timeline: TimeData[] = [];
  const totalSprintDays = dateRange.length - 1;
  let previousRemaining = initialTotal;

  dateRange.forEach((date, dayIndex) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isFutureDate = date > today;
    const dayState = issueStateByDate.get(dateStr)!;
    const dayTimeSpent = timeSpentByDate.get(dateStr)!;

    // Calculate total estimate on this date
    let totalEstimateOnDate = 0;
    dayState.estimates.forEach(estimate => {
      totalEstimateOnDate += estimate;
    });

    // Calculate time spent from worklogs (accurate historical data!)
    let timeSpentSeconds = 0;
    let completedWorkSeconds = 0;
    let issuesCompleted = 0;

    if (!isFutureDate) {
      // Sum up cumulative time spent for all issues in sprint on this day
      dayState.issues.forEach(issueKey => {
        timeSpentSeconds += dayTimeSpent.get(issueKey) || 0;
      });

      // Calculate completed work
      issues.forEach(issue => {
        if (dayState.issues.has(issue.key)) {
          if (issue.fields.resolutiondate) {
            const resolvedDate = startOfDay(parseISO(issue.fields.resolutiondate));
            if (resolvedDate <= date) {
              completedWorkSeconds += dayState.estimates.get(issue.key) || 0;
              issuesCompleted++;
            }
          }
        }
      });
    }

    // Remaining work calculation depends on method
    let remainingWorkSeconds: number;
    if (isFutureDate) {
      remainingWorkSeconds = 0;
    } else if (calculationMethod === 'remaining') {
      // Method = Remaining: Sum of remaining estimates (Done issues = 0)
      remainingWorkSeconds = 0;
      dayState.issues.forEach(issueKey => {
        const issue = issues.find(i => i.key === issueKey);
        if (issue) {
          let estimateValue = dayState.estimates.get(issueKey) || 0;

          if (issue.fields.resolutiondate) {
            const resolvedDate = startOfDay(parseISO(issue.fields.resolutiondate));
            if (resolvedDate <= date) {
              estimateValue = 0; // Issue done: remaining = 0
            }
          }

          remainingWorkSeconds += estimateValue;
        }
      });
    } else {
      // Method = Original: Total - Completed
      remainingWorkSeconds = totalEstimateOnDate - completedWorkSeconds;
    }

    // Ideal line: Linear decrease from initial total
    const idealRemainingSeconds = totalSprintDays > 0
      ? initialTotal * (1 - dayIndex / totalSprintDays)
      : 0;

    // Calculate delta (change from previous day)
    const deltaSeconds = dayIndex === 0
      ? 0
      : remainingWorkSeconds - previousRemaining;

    // Build delta reason
    let deltaReason = '';
    if (!isFutureDate && dayIndex > 0) {
      if (deltaSeconds < 0) {
        deltaReason = `Completed work: ${Math.abs(Math.round(deltaSeconds / 3600))}h`;
      } else if (deltaSeconds > 0) {
        deltaReason = `Scope added: +${Math.round(deltaSeconds / 3600)}h`;
      } else {
        deltaReason = 'No change';
      }
    }

    // Debug logging for first 3 days and today
    if (dayIndex < 3 || dateStr === format(today, 'yyyy-MM-dd')) {
      console.log(`\n[Timeline ${dateStr}] Day ${dayIndex} (With Worklogs):`);
      console.log(`  Issues in sprint: ${dayState.issues.size}`);
      console.log(`  Total estimate: ${Math.round(totalEstimateOnDate / 3600)}h`);
      console.log(`  Time spent (from worklogs): ${Math.round(timeSpentSeconds / 3600)}h ✓ ACCURATE`);
      console.log(`  Completed work: ${Math.round(completedWorkSeconds / 3600)}h`);
      console.log(`  Remaining work: ${Math.round(remainingWorkSeconds / 3600)}h`);
    }

    timeline.push({
      date: dateStr,
      timeSpentSeconds,
      timeEstimateSeconds: totalEstimateOnDate,
      remainingWorkSeconds,
      idealRemainingSeconds,
      ratio: totalEstimateOnDate > 0
        ? (completedWorkSeconds / totalEstimateOnDate) * 100
        : 0,
      issuesCompleted,
      totalIssues: dayState.issues.size,
      deltaSeconds,
      deltaReason
    });

    // Update previous for next iteration
    if (!isFutureDate) {
      previousRemaining = remainingWorkSeconds;
    }
  });

  // Calculate final totals
  // For 'remaining' method: use sprint-start total (initialTotal)
  // For 'original' method: use current original estimates
  let totalEstimate = 0;
  if (calculationMethod === 'remaining') {
    // Use sprint-start total (already calculated with historical values)
    totalEstimate = initialTotal;
  } else {
    // For 'original' method, sum current original estimates
    issues.forEach(issue => {
      totalEstimate += getEstimateValue(issue, calculationMethod);
    });
  }

  const totalSpent = worklogsByIssue.reduce(
    (sum, w) => sum + w.totalTimeSpentSeconds,
    0
  );

  console.log(`\nFinal total estimate: ${totalEstimate}s (${Math.round(totalEstimate / 3600)}h)`);
  console.log(`Final total spent (from worklogs): ${totalSpent}s (${Math.round(totalSpent / 3600)}h)`);
  console.log(`Method: ${calculationMethod} (${calculationMethod === 'remaining' ? 'using sprint-start total' : 'using current totals'})`);

  return { totalEstimate, totalSpent, timeline };
}

/**
 * Build daily change summary from worklogs and changelog
 * Shows which issues had time spent, estimate, or remaining changes on each day
 */
export function buildDailyChangeSummary(
  issues: JiraIssue[],
  worklogsByIssue: WorklogsByIssue[],
  sprintStartDate: string,
  sprintEndDate: string
): DailyChangeSummary[] {
  const startDate = startOfDay(parseISO(sprintStartDate));
  const endDate = startOfDay(parseISO(sprintEndDate));
  const today = startOfDay(new Date());
  const effectiveEndDate = endDate > today ? today : endDate;

  const dateRange = eachDayOfInterval({ start: startDate, end: effectiveEndDate });

  // Create issue key to summary map
  const issueSummaryMap = new Map<string, string>();
  issues.forEach(issue => {
    issueSummaryMap.set(issue.key, issue.fields.summary);
  });

  // Parse changelog for estimate changes
  const allEstimateChanges: Array<{
    issueKey: string;
    date: string;
    changeType: 'originalEstimate' | 'remainingEstimate';
    fromValue: number;
    toValue: number;
    delta: number;
  }> = [];

  issues.forEach(issue => {
    const estimateChanges = parseEstimateChanges(issue);
    estimateChanges.forEach(change => {
      const changeDate = format(startOfDay(parseISO(change.changeDate)), 'yyyy-MM-dd');
      allEstimateChanges.push({
        issueKey: change.issueKey,
        date: changeDate,
        changeType: change.field,
        fromValue: change.fromValue,
        toValue: change.toValue,
        delta: change.toValue - change.fromValue,
      });
    });
  });

  // Build daily summaries
  const dailySummaries: DailyChangeSummary[] = [];

  dateRange.forEach(date => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const changes: DailyIssueChange[] = [];

    // Add worklog changes for this day
    worklogsByIssue.forEach(({ issueKey, worklogs }) => {
      const dayWorklogs = worklogs.filter(w => {
        const worklogDate = format(startOfDay(parseISO(w.started)), 'yyyy-MM-dd');
        return worklogDate === dateStr;
      });

      if (dayWorklogs.length > 0) {
        const totalTimeSpent = dayWorklogs.reduce((sum, w) => sum + w.timeSpentSeconds, 0);

        // Get previous day's cumulative time spent
        const prevDayWorklogs = worklogs.filter(w => {
          const worklogDate = startOfDay(parseISO(w.started));
          return worklogDate < date;
        });
        const prevCumulative = prevDayWorklogs.reduce((sum, w) => sum + w.timeSpentSeconds, 0);

        changes.push({
          issueKey,
          summary: issueSummaryMap.get(issueKey) || '',
          changeType: 'timeSpent',
          previousValue: prevCumulative,
          newValue: prevCumulative + totalTimeSpent,
          delta: totalTimeSpent,
          author: dayWorklogs[0]?.author?.displayName,
        });
      }
    });

    // Add estimate changes for this day
    const dayEstimateChanges = allEstimateChanges.filter(c => c.date === dateStr);
    dayEstimateChanges.forEach(change => {
      changes.push({
        issueKey: change.issueKey,
        summary: issueSummaryMap.get(change.issueKey) || '',
        changeType: change.changeType,
        previousValue: change.fromValue,
        newValue: change.toValue,
        delta: change.delta,
      });
    });

    // Calculate totals
    const totalTimeSpentDelta = changes
      .filter(c => c.changeType === 'timeSpent')
      .reduce((sum, c) => sum + c.delta, 0);
    const totalEstimateDelta = changes
      .filter(c => c.changeType === 'originalEstimate')
      .reduce((sum, c) => sum + c.delta, 0);
    const totalRemainingDelta = changes
      .filter(c => c.changeType === 'remainingEstimate')
      .reduce((sum, c) => sum + c.delta, 0);

    dailySummaries.push({
      date: dateStr,
      changes,
      totalTimeSpentDelta,
      totalEstimateDelta,
      totalRemainingDelta,
    });
  });

  return dailySummaries;
}
