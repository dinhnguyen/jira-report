import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira-client';
import {
  calculateTimeDataWithWorklogs,
  calculateTimeDataWithHistory,
  calculateTimeData,
  getCompletedIssuesByDate,
  buildDailyChangeSummary
} from '@/lib/time-calculator';
import { JiraIssue, WorklogsByIssue, DailyChangeSummary } from '@/types/jira';

// Helper to send status update
function sendStatus(controller: ReadableStreamDefaultController, message: string) {
  const data = JSON.stringify({ type: 'status', message }) + '\n';
  controller.enqueue(new TextEncoder().encode(data));
}

// Helper to send error
function sendError(controller: ReadableStreamDefaultController, error: string) {
  const data = JSON.stringify({ type: 'error', message: error }) + '\n';
  controller.enqueue(new TextEncoder().encode(data));
}

// Helper to send final data
function sendData(controller: ReadableStreamDefaultController, data: any) {
  const payload = JSON.stringify({ type: 'data', data }) + '\n';
  controller.enqueue(new TextEncoder().encode(payload));
}

export async function POST(request: Request) {
  const { boardIds, domain, email, apiToken, calculationMethod } = await request.json();

  if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
    return NextResponse.json(
      { error: 'Please provide at least one board ID' },
      { status: 400 }
    );
  }

  const jiraDomain = domain || process.env.NEXT_PUBLIC_JIRA_DOMAIN;
  const jiraEmail = email || process.env.NEXT_PUBLIC_JIRA_EMAIL;
  const jiraApiToken = apiToken || process.env.JIRA_API_TOKEN;

  if (!jiraDomain || !jiraEmail || !jiraApiToken) {
    return NextResponse.json(
      { error: 'Missing Jira configuration' },
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new JiraClient(jiraDomain, jiraEmail, jiraApiToken);

        const allIssues: JiraIssue[] = [];
        const sprintInfo: Array<{
          boardId: string;
          sprintId: number;
          sprintName: string;
          startDate?: string;
          endDate?: string;
        }> = [];
        let earliestSprintStart: string | undefined;
        let latestSprintEnd: string | undefined;

        sendStatus(controller, `Processing ${boardIds.length} board(s)...`);

        for (const boardId of boardIds) {
          try {
            sendStatus(controller, `Board ${boardId}: Finding active sprint...`);
            const activeSprint = await client.getActiveSprint(boardId);

            if (activeSprint) {
              sendStatus(
                controller,
                `Board ${boardId}: Found sprint "${activeSprint.name}" (ID: ${activeSprint.id})`
              );

              sprintInfo.push({
                boardId,
                sprintId: activeSprint.id,
                sprintName: activeSprint.name,
                startDate: activeSprint.startDate,
                endDate: activeSprint.endDate,
              });

              if (activeSprint.startDate) {
                if (!earliestSprintStart || activeSprint.startDate < earliestSprintStart) {
                  earliestSprintStart = activeSprint.startDate;
                }
              }
              if (activeSprint.endDate) {
                if (!latestSprintEnd || activeSprint.endDate > latestSprintEnd) {
                  latestSprintEnd = activeSprint.endDate;
                }
              }

              try {
                sendStatus(controller, `Board ${boardId}: Fetching issues with changelog...`);
                const issues = await client.getActiveSprintIssuesWithChangelog(boardId);

                const parentCount = issues.filter(i => !i.fields.parent).length;
                const childCount = issues.filter(i => i.fields.parent).length;

                sendStatus(
                  controller,
                  `Board ${boardId}: Found ${issues.length} issues (${parentCount} stories, ${childCount} tasks)`
                );

                allIssues.push(...issues);
              } catch (fetchError: any) {
                sendStatus(controller, `Board ${boardId}: Changelog fetch failed, using fallback...`);
                const issues = await client.getActiveSprintIssues(boardId);
                sendStatus(controller, `Board ${boardId}: Fetched ${issues.length} issues (no changelog)`);
                allIssues.push(...issues);
              }
            } else {
              sendStatus(controller, `Board ${boardId}: No active sprint found`);
            }
          } catch (error: any) {
            sendError(controller, `Board ${boardId}: Error - ${error.message}`);
          }
        }

        if (allIssues.length === 0) {
          const message = sprintInfo.length > 0
            ? 'Sprint found but has no issues'
            : 'No sprints found for the selected boards';

          sendData(controller, {
            totalEstimate: 0,
            totalSpent: 0,
            timeline: [],
            issueCount: 0,
            completedIssuesByDate: [],
            sprintInfo,
            message,
          });
          controller.close();
          return;
        }

        sendStatus(controller, `Total: ${allIssues.length} issues collected`);
        sendStatus(controller, 'Fetching worklogs for accurate time tracking...');

        let worklogsByIssue: WorklogsByIssue[] = [];
        try {
          const issueKeys = allIssues.map(i => i.key);
          worklogsByIssue = await client.getWorklogsForIssues(issueKeys);
          sendStatus(controller, `Worklogs fetched for ${worklogsByIssue.length} issues`);
        } catch (worklogError: any) {
          sendStatus(controller, 'Worklog fetch failed, using changelog fallback');
        }

        sendStatus(controller, 'Calculating burndown data...');

        let timeData;
        if (sprintInfo.length > 0 && earliestSprintStart && latestSprintEnd) {
          if (worklogsByIssue.length > 0) {
            sendStatus(controller, 'Using worklog-based time tracking (most accurate)');
            timeData = calculateTimeDataWithWorklogs(
              allIssues,
              earliestSprintStart,
              latestSprintEnd,
              sprintInfo[0].sprintId,
              worklogsByIssue,
              calculationMethod || 'original'
            );
          } else {
            sendStatus(controller, 'Using changelog-based time tracking');
            timeData = calculateTimeDataWithHistory(
              allIssues,
              earliestSprintStart,
              latestSprintEnd,
              sprintInfo[0].sprintId,
              calculationMethod || 'original'
            );
          }
        } else {
          timeData = calculateTimeData(
            allIssues,
            earliestSprintStart,
            latestSprintEnd,
            calculationMethod || 'original'
          );
        }

        const completedIssuesByDate = getCompletedIssuesByDate(allIssues);

        let dailyChanges: DailyChangeSummary[] = [];
        if (earliestSprintStart && latestSprintEnd && worklogsByIssue.length > 0) {
          dailyChanges = buildDailyChangeSummary(
            allIssues,
            worklogsByIssue,
            earliestSprintStart,
            latestSprintEnd
          );
        }

        sendStatus(controller, 'Chart generation complete!');

        sendData(controller, {
          ...timeData,
          issueCount: allIssues.length,
          completedIssuesByDate,
          dailyChanges,
          sprintInfo,
          sprintStartDate: earliestSprintStart,
          sprintEndDate: latestSprintEnd,
          allIssues,
        });

        controller.close();
      } catch (error: any) {
        sendError(controller, `Fatal error: ${error.message}`);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
