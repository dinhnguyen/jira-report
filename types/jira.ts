export interface JiraBoard {
  id: number;
  name: string;
  type: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  expand?: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: {
        key: string;
      };
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    parent?: {
      key: string;
      fields: {
        summary: string;
      };
    };
    timetracking?: {
      originalEstimate?: string;
      remainingEstimate?: string;
      timeSpent?: string;
      originalEstimateSeconds?: number;
      remainingEstimateSeconds?: number;
      timeSpentSeconds?: number;
    };
    created: string;
    updated: string;
    resolutiondate?: string;
    sprint?: JiraSprint[];
  };
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

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
}

export interface TimeData {
  date: string;
  timeSpentSeconds: number;
  timeEstimateSeconds: number;
  remainingWorkSeconds: number;
  idealRemainingSeconds: number;
  ratio: number;
  issuesCompleted: number;
  totalIssues: number;
  deltaSeconds?: number; // Daily change in remaining work (negative = work completed, positive = scope added)
  deltaReason?: string; // Brief description of what changed
}

export interface BurndownData {
  timeline: TimeData[];
  totalEstimate: number;
  totalSpent: number;
  boards: JiraBoard[];
}

export interface BoardSelection {
  boardId: string;
  boardName: string;
  selected: boolean;
}

export interface CompletedIssue {
  key: string;
  summary: string;
  assignee: string;
  timeSpent: number;
  completedDate: string;
}

export interface CompletedIssuesByDate {
  date: string;
  issues: CompletedIssue[];
}

export interface JiraWorklog {
  id: string;
  issueId: string;
  author: {
    displayName: string;
    emailAddress?: string;
  };
  created: string;
  updated: string;
  started: string; // When the work was actually done
  timeSpent: string; // e.g., "2h 30m"
  timeSpentSeconds: number;
}

export interface WorklogsByIssue {
  issueKey: string;
  worklogs: JiraWorklog[];
  totalTimeSpentSeconds: number;
}

export interface DailyIssueChange {
  issueKey: string;
  summary: string;
  changeType: 'timeSpent' | 'originalEstimate' | 'remainingEstimate';
  previousValue: number; // in seconds
  newValue: number; // in seconds
  delta: number; // in seconds (positive = increase, negative = decrease)
  author?: string;
}

export interface DailyChangeSummary {
  date: string;
  changes: DailyIssueChange[];
  totalTimeSpentDelta: number;
  totalEstimateDelta: number;
  totalRemainingDelta: number;
}
