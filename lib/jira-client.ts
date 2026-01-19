import axios, { AxiosInstance } from 'axios';
import { JiraBoard, JiraIssue, JiraSprint, JiraWorklog, WorklogsByIssue } from '@/types/jira';

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
      console.log(`Board ${boardId} - Looking for sprint...`);
      console.log(`Board ${boardId} - Available sprint states:`, sprints.map(s => s.state));

      // Priority: active > future > most recent closed
      let sprint = sprints.find(s => s.state === 'active');

      if (!sprint) {
        console.log(`Board ${boardId} - No active sprint, checking for future sprint...`);
        sprint = sprints.find(s => s.state === 'future');
      }

      if (!sprint) {
        console.log(`Board ${boardId} - No future sprint, getting most recent closed sprint...`);
        const closedSprints = sprints
          .filter(s => s.state === 'closed')
          .sort((a, b) => {
            const dateA = a.completeDate ? new Date(a.completeDate).getTime() : 0;
            const dateB = b.completeDate ? new Date(b.completeDate).getTime() : 0;
            return dateB - dateA; // Most recent first
          });
        sprint = closedSprints[0] || null;
      }

      if (sprint) {
        console.log(`Board ${boardId} - Found sprint: ${sprint.name} (state: ${sprint.state})`);
      } else {
        console.log(`Board ${boardId} - No sprint found. All states:`, sprints.map(s => `${s.name}=${s.state}`));
      }

      return sprint || null;
    } catch (error) {
      console.error(`Error fetching sprint for board ${boardId}:`, error);
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

  async getActiveSprintIssuesWithChangelog(boardId: string): Promise<JiraIssue[]> {
    try {
      const activeSprint = await this.getActiveSprint(boardId);
      if (!activeSprint) {
        console.log(`No active sprint found for board ${boardId}`);
        return [];
      }

      console.log(`Found active sprint: ${activeSprint.name} (ID: ${activeSprint.id})`);
      console.log(`Fetching issues with changelog for sprint ${activeSprint.id}...`);

      const jql = `sprint = ${activeSprint.id}`;
      const issues = await this.getIssuesByJQLWithChangelog(jql);
      console.log(`✓ Fetched ${issues.length} issues with changelog`);

      return issues;
    } catch (error) {
      console.error(`Error fetching active sprint issues with changelog for board ${boardId}:`, error);
      throw error;
    }
  }

  async getIssuesByJQLWithChangelog(jql: string): Promise<JiraIssue[]> {
    try {
      // Use API v3 for changelog support
      const searchClient = axios.create({
        baseURL: `https://${this.domain}/rest/api/3`,
        auth: this.client.defaults.auth,
        headers: this.client.defaults.headers,
      });

      console.log(`\n=== FETCHING ISSUES WITH CHANGELOG ===`);
      console.log(`Using API v3: POST /rest/api/3/search/jql`);
      console.log(`JQL query: ${jql}`);

      // Step 1: Get all issues WITHOUT changelog (fast)
      // Using new /search/jql endpoint with nextPageToken pagination
      console.log(`Step 1: Fetching issues list...`);
      let allIssues: JiraIssue[] = [];
      const maxResults = 100;
      let nextPageToken: string | undefined = undefined;

      do {
        const requestBody: {
          jql: string;
          maxResults: number;
          fields: string[];
          nextPageToken?: string;
        } = {
          jql,
          maxResults,
          fields: ['summary', 'status', 'assignee', 'parent', 'timetracking', 'created', 'updated', 'resolutiondate', 'sprint'],
        };

        if (nextPageToken) {
          requestBody.nextPageToken = nextPageToken;
        }

        const response = await searchClient.post('/search/jql', requestBody);

        allIssues = allIssues.concat(response.data.issues || []);
        nextPageToken = response.data.nextPageToken;

        console.log(`  Fetched ${response.data.issues?.length || 0} issues, total so far: ${allIssues.length}`);
      } while (nextPageToken);

      console.log(`✓ Fetched ${allIssues.length} issues`);

      // Step 2: Fetch changelog for each issue (accurate but slower)
      console.log(`Step 2: Fetching changelog for ${allIssues.length} issues...`);
      const issuesWithChangelog: JiraIssue[] = [];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < allIssues.length; i++) {
        const issue = allIssues[i];
        try {
          // Fetch individual issue with changelog
          const issueResponse = await searchClient.get(`/issue/${issue.key}`, {
            params: {
              fields: 'summary,status,assignee,parent,timetracking,created,updated,resolutiondate,sprint',
              expand: 'changelog',
            },
          });

          const issueWithChangelog = issueResponse.data;

          // Log first issue to verify
          if (i === 0) {
            console.log(`Sample issue ${issueWithChangelog.key}:`, {
              hasChangelog: 'changelog' in issueWithChangelog,
              changelogTotal: issueWithChangelog.changelog?.total || 0,
              historiesLength: issueWithChangelog.changelog?.histories?.length || 0,
            });
          }

          issuesWithChangelog.push(issueWithChangelog);
          successCount++;

          // Progress indicator
          if ((i + 1) % 10 === 0 || i === allIssues.length - 1) {
            console.log(`  Progress: ${i + 1}/${allIssues.length} issues fetched`);
          }
        } catch (error: any) {
          console.error(`  ✗ Failed to fetch changelog for ${issue.key}:`, error.message);
          failCount++;
          // Add issue without changelog as fallback
          issuesWithChangelog.push(issue);
        }
      }

      console.log(`✓ Successfully fetched changelog for ${successCount}/${allIssues.length} issues`);
      if (failCount > 0) {
        console.log(`⚠ Failed to fetch changelog for ${failCount} issues (using fallback)`);
      }

      // Log final stats
      const withChangelog = issuesWithChangelog.filter(i => i.changelog && i.changelog.histories.length > 0).length;
      console.log(`Final: ${withChangelog}/${issuesWithChangelog.length} issues have changelog data`);

      return issuesWithChangelog;
    } catch (error: any) {
      console.error(`Error fetching issues by JQL with changelog "${jql}":`, error.message);
      if (error.response) {
        console.error(`Response status:`, error.response.status);
        console.error(`Response data:`, JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get worklogs for a single issue
   * Returns all work log entries with timestamps for accurate historical tracking
   */
  async getIssueWorklogs(issueKey: string): Promise<JiraWorklog[]> {
    try {
      const searchClient = axios.create({
        baseURL: `https://${this.domain}/rest/api/3`,
        auth: this.client.defaults.auth,
        headers: this.client.defaults.headers,
      });

      let allWorklogs: JiraWorklog[] = [];
      let startAt = 0;
      const maxResults = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await searchClient.get(`/issue/${issueKey}/worklog`, {
          params: {
            startAt,
            maxResults,
          },
        });

        const worklogs = response.data.worklogs.map((w: any) => ({
          id: w.id,
          issueId: w.issueId,
          author: {
            displayName: w.author?.displayName || 'Unknown',
            emailAddress: w.author?.emailAddress,
          },
          created: w.created,
          updated: w.updated,
          started: w.started,
          timeSpent: w.timeSpent,
          timeSpentSeconds: w.timeSpentSeconds,
        }));

        allWorklogs = allWorklogs.concat(worklogs);
        startAt += maxResults;
        hasMore = response.data.total > startAt;
      }

      return allWorklogs;
    } catch (error: any) {
      console.error(`Error fetching worklogs for ${issueKey}:`, error.message);
      return []; // Return empty array on error, don't fail entire operation
    }
  }

  /**
   * Get worklogs for multiple issues
   * Fetches in parallel with rate limiting to avoid API throttling
   */
  async getWorklogsForIssues(issueKeys: string[]): Promise<WorklogsByIssue[]> {
    console.log(`\n=== FETCHING WORKLOGS FOR ${issueKeys.length} ISSUES ===`);

    const results: WorklogsByIssue[] = [];
    const batchSize = 10; // Process 10 issues at a time to avoid rate limiting

    for (let i = 0; i < issueKeys.length; i += batchSize) {
      const batch = issueKeys.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (issueKey) => {
          const worklogs = await this.getIssueWorklogs(issueKey);
          const totalTimeSpentSeconds = worklogs.reduce(
            (sum, w) => sum + w.timeSpentSeconds,
            0
          );
          return {
            issueKey,
            worklogs,
            totalTimeSpentSeconds,
          };
        })
      );

      results.push(...batchResults);

      // Progress indicator
      const processed = Math.min(i + batchSize, issueKeys.length);
      console.log(`  Fetched worklogs: ${processed}/${issueKeys.length} issues`);

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < issueKeys.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Summary
    const totalWorklogs = results.reduce((sum, r) => sum + r.worklogs.length, 0);
    const totalTimeSpent = results.reduce((sum, r) => sum + r.totalTimeSpentSeconds, 0);
    console.log(`✓ Total worklogs fetched: ${totalWorklogs}`);
    console.log(`✓ Total time logged: ${Math.round(totalTimeSpent / 3600)}h`);

    return results;
  }
}
