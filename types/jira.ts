export interface JiraBoard {
  id: number;
  name: string;
  type: string;
}

export interface JiraIssue {
  id: string;
  key: string;
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
