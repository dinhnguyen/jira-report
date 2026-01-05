import axios, { AxiosInstance } from 'axios';
import { JiraBoard, JiraIssue, JiraSprint } from '@/types/jira';

export class JiraClient {
  private client: AxiosInstance;
  private domain: string;

  constructor(domain: string, email: string, apiToken: string) {
    this.domain = domain;
    this.client = axios.create({
      baseURL: `https://${domain}/rest/agile/1.0`,
      auth: {
        username: email,
        password: apiToken,
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async getAllBoards(): Promise<JiraBoard[]> {
    try {
      console.log('Fetching boards from:', `https://${this.domain}/rest/agile/1.0/board`);
      const response = await this.client.get('/board');
      console.log('Boards response:', response.data);
      return response.data.values;
    } catch (error: any) {
      console.error('Error fetching boards:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  async getBoardIssues(boardId: string): Promise<JiraIssue[]> {
    try {
      let allIssues: JiraIssue[] = [];
      let startAt = 0;
      const maxResults = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get(`/board/${boardId}/issue`, {
          params: {
            startAt,
            maxResults,
            fields: 'summary,status,timetracking,created,updated,resolutiondate',
          },
        });

        allIssues = allIssues.concat(response.data.issues);
        startAt += maxResults;
        hasMore = response.data.total > startAt;
      }

      return allIssues;
    } catch (error) {
      console.error(`Error fetching issues for board ${boardId}:`, error);
      throw error;
    }
  }

  async getSprints(boardId: string): Promise<JiraSprint[]> {
    try {
      const response = await this.client.get(`/board/${boardId}/sprint`);
      console.log(`Board ${boardId} - Total sprints:`, response.data.values.length);
      console.log(`Board ${boardId} - Sprint states:`, response.data.values.map((s: any) => `${s.name} (${s.state})`).join(', '));
      return response.data.values;
    } catch (error) {
      console.error(`Error fetching sprints for board ${boardId}:`, error);
      throw error;
    }
  }

  async getActiveSprint(boardId: string): Promise<JiraSprint | null> {
    try {
      const sprints = await this.getSprints(boardId);
      console.log(`Board ${boardId} - Looking for active sprint...`);
      console.log(`Board ${boardId} - Available sprint states:`, sprints.map(s => s.state));

      const activeSprint = sprints.find(sprint => sprint.state === 'active');

      if (activeSprint) {
        console.log(`Board ${boardId} - Found active sprint: ${activeSprint.name}`);
      } else {
        console.log(`Board ${boardId} - No active sprint found. All states:`, sprints.map(s => `${s.name}=${s.state}`));
      }

      return activeSprint || null;
    } catch (error) {
      console.error(`Error fetching active sprint for board ${boardId}:`, error);
      throw error;
    }
  }

  async getSprintIssues(sprintId: number): Promise<JiraIssue[]> {
    try {
      let allIssues: JiraIssue[] = [];
      let startAt = 0;
      const maxResults = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get(`/sprint/${sprintId}/issue`, {
          params: {
            startAt,
            maxResults,
            fields: 'summary,status,assignee,parent,timetracking,created,updated,resolutiondate,sprint',
          },
        });

        console.log(`Sprint ${sprintId} - Fetched ${response.data.issues.length} issues (total: ${response.data.total})`);
        allIssues = allIssues.concat(response.data.issues);
        startAt += maxResults;
        hasMore = response.data.total > startAt;
      }

      console.log(`Sprint ${sprintId} - Total issues fetched: ${allIssues.length}`);
      console.log(`Sprint ${sprintId} - Issue keys (sorted):`, allIssues.map(i => i.key).sort().join(', '));

      // Log parent field info
      const parentsCount = allIssues.filter(i => !i.fields.parent).length;
      const childrenCount = allIssues.filter(i => i.fields.parent).length;
      console.log(`Sprint ${sprintId} - ${parentsCount} parents, ${childrenCount} children`);

      // Log any issues that might be missing parent field
      const withoutParent = allIssues.filter(i => i.fields.parent === undefined || i.fields.parent === null);
      if (withoutParent.length > 0 && withoutParent.length < allIssues.length) {
        console.log(`Sprint ${sprintId} - Issues without parent field:`, withoutParent.map(i => i.key).join(', '));
      }

      // Log parent field details for ALL issues with parent
      const withParent = allIssues.filter(i => i.fields.parent);
      if (withParent.length > 0) {
        console.log(`Sprint ${sprintId} - Issues WITH parent field (${withParent.length} total):`);
        withParent.forEach(issue => {
          console.log(`  ${issue.key} -> parent: ${issue.fields.parent?.key}`);
        });
      }

      // Log sprint field structure for debugging
      if (allIssues.length > 0) {
        const sampleSprint = allIssues[0].fields.sprint;
        console.log(`Sprint field type:`, typeof sampleSprint);
        console.log(`Sprint field is array:`, Array.isArray(sampleSprint));
      }

      return allIssues;
    } catch (error) {
      console.error(`Error fetching issues for sprint ${sprintId}:`, error);
      throw error;
    }
  }

  async getIssuesByJQLv2(jql: string): Promise<JiraIssue[]> {
    try {
      let allIssues: JiraIssue[] = [];
      let startAt = 0;
      const maxResults = 100;
      let hasMore = true;

      // Use API v2 instead of v3
      const searchClient = axios.create({
        baseURL: `https://${this.domain}/rest/api/2`,
        auth: this.client.defaults.auth,
        headers: this.client.defaults.headers,
      });

      console.log(`JQL v2 - Making request to: https://${this.domain}/rest/api/2/search`);
      console.log(`JQL query: ${jql}`);

      while (hasMore) {
        const response = await searchClient.get('/search', {
          params: {
            jql,
            startAt,
            maxResults,
            fields: 'summary,status,assignee,parent,timetracking,created,updated,resolutiondate,sprint',
          },
        });

        console.log(`JQL v2 search - Fetched ${response.data.issues.length} issues (total: ${response.data.total})`);
        allIssues = allIssues.concat(response.data.issues);
        startAt += maxResults;
        hasMore = response.data.total > startAt;
      }

      console.log(`JQL v2 search - Total issues: ${allIssues.length}`);
      console.log(`JQL v2 search - Issue keys:`, allIssues.map((i: any) => i.key).sort().join(', '));

      return allIssues;
    } catch (error: any) {
      console.error(`Error fetching issues by JQL v2 "${jql}":`, error.message);
      if (error.response) {
        console.error(`Response status:`, error.response.status);
        console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  async getActiveSprintIssues(boardId: string): Promise<JiraIssue[]> {
    try {
      const activeSprint = await this.getActiveSprint(boardId);
      if (!activeSprint) {
        console.log(`No active sprint found for board ${boardId}`);
        return [];
      }

      console.log(`Found active sprint: ${activeSprint.name} (ID: ${activeSprint.id})`);

      // Try JQL v2 search first to get ALL issues in the sprint (including carried over)
      try {
        const jql = `sprint = ${activeSprint.id}`;
        console.log(`Attempting JQL v2 query: ${jql}`);
        const jqlIssues = await this.getIssuesByJQLv2(jql);
        console.log(`✓ JQL v2 search successful, got ${jqlIssues.length} issues`);
        return jqlIssues;
      } catch (jqlError: any) {
        console.error(`JQL v2 search failed:`, jqlError.message);
        console.log(`Falling back to agile API endpoint...`);

        // Fallback to agile API endpoint
        const issues = await this.getSprintIssues(activeSprint.id);
        console.log(`✓ Agile API successful, got ${issues.length} issues`);
        return issues;
      }
    } catch (error) {
      console.error(`Error fetching active sprint issues for board ${boardId}:`, error);
      throw error;
    }
  }
}
