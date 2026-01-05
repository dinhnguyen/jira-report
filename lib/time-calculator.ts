import { JiraIssue, TimeData, CompletedIssuesByDate } from '@/types/jira';
import { format, parseISO, eachDayOfInterval, startOfDay } from 'date-fns';

export function calculateTimeData(
  issues: JiraIssue[],
  sprintStartDate?: string,
  sprintEndDate?: string
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

  // Calculate totals
  let totalEstimate = 0;
  let totalSpent = 0;

  issues.forEach(issue => {
    const timeTracking = issue.fields.timetracking;
    if (timeTracking) {
      totalEstimate += timeTracking.originalEstimateSeconds || 0;
      totalSpent += timeTracking.timeSpentSeconds || 0;
    }
  });

  // Create timeline data
  const timeline = createTimeline(issues, sprintStartDate, sprintEndDate);

  return {
    totalEstimate,
    totalSpent,
    timeline,
  };
}

function createTimeline(
  issues: JiraIssue[],
  sprintStartDate?: string,
  sprintEndDate?: string
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
    return sum + (issue.fields.timetracking?.originalEstimateSeconds || 0);
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

          // Track total estimate (including scope creep)
          timeEstimateSeconds += timeTracking.originalEstimateSeconds || 0;

          // Check if issue was completed by this date
          if (issue.fields.resolutiondate) {
            const resolvedDate = parseISO(issue.fields.resolutiondate);
            if (resolvedDate <= date) {
              completedWorkSeconds += timeTracking.originalEstimateSeconds || 0;
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

    // Remaining work = Total estimate (including scope changes) - Completed work
    // For future dates, set to 0 so it won't be displayed
    const remainingWorkSeconds = isFutureDate ? 0 : (timeEstimateSeconds - completedWorkSeconds);

    // Ideal remaining = Linear decrease from total estimate to 0
    const idealRemainingSeconds = totalSprintDays > 0
      ? totalEstimateAtStart * (1 - dayIndex / totalSprintDays)
      : 0;

    // Debug logging for today's date
    if (dateStr === format(today, 'yyyy-MM-dd')) {
      console.log('\n=== TIME CALCULATOR DEBUG (Today) ===');
      console.log('Date:', dateStr);
      console.log('Is future date:', isFutureDate);
      console.log('Relevant issues:', relevantIssues.length);
      console.log('Time estimate (all issues in sprint):', timeEstimateSeconds, 's');
      console.log('Completed work (done issues):', completedWorkSeconds, 's');
      console.log('Remaining work:', remainingWorkSeconds, 's');
      console.log('Ideal remaining:', idealRemainingSeconds, 's');
      console.log('Total estimate at start:', totalEstimateAtStart, 's');
      console.log('Issues completed:', issuesCompleted);
    }

    const ratio = timeEstimateSeconds > 0
      ? (timeSpentSeconds / timeEstimateSeconds) * 100
      : 0;

    timelineMap.set(dateStr, {
      date: dateStr,
      timeSpentSeconds,
      timeEstimateSeconds,
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
