import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira-client';
import {
  calculateTimeData,
  calculateTimeDataWithHistory,
  calculateTimeDataWithWorklogs,
  getCompletedIssuesByDate,
  buildDailyChangeSummary
} from '@/lib/time-calculator';
import { JiraIssue, WorklogsByIssue, DailyChangeSummary } from '@/types/jira';

export async function POST(request: Request) {
  try {
    const { boardIds, domain, email, apiToken, calculationMethod } = await request.json();

    if (!boardIds || !Array.isArray(boardIds) || boardIds.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one board ID' },
        { status: 400 }
      );
    }

    // Use provided credentials or fall back to environment variables
    const jiraDomain = domain || process.env.NEXT_PUBLIC_JIRA_DOMAIN;
    const jiraEmail = email || process.env.NEXT_PUBLIC_JIRA_EMAIL;
    const jiraApiToken = apiToken || process.env.JIRA_API_TOKEN;

    if (!jiraDomain || !jiraEmail || !jiraApiToken) {
      return NextResponse.json(
        { error: 'Missing Jira configuration. Please configure your Jira credentials in Settings.' },
        { status: 400 }
      );
    }

    const client = new JiraClient(jiraDomain, jiraEmail, jiraApiToken);

    // Fetch issues from active sprints of all selected boards
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

    console.log(`Processing ${boardIds.length} boards:`, boardIds);

    for (const boardId of boardIds) {
      try {
        console.log(`\n=== Processing board ${boardId} ===`);
        const activeSprint = await client.getActiveSprint(boardId);
        if (activeSprint) {
          console.log(`✓ Board ${boardId} has sprint: ${activeSprint.name} (ID: ${activeSprint.id}, state: ${activeSprint.state})`);
          sprintInfo.push({
            boardId,
            sprintId: activeSprint.id,
            sprintName: activeSprint.name,
            startDate: activeSprint.startDate,
            endDate: activeSprint.endDate,
          });

          // Track earliest start and latest end date across all sprints
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

          // Use new method with changelog for accurate scope tracking
          try {
            console.log(`→ Fetching issues with changelog for sprint ${activeSprint.id}...`);
            const issues = await client.getActiveSprintIssuesWithChangelog(boardId);
            console.log(`✓ Board ${boardId} fetched ${issues.length} issues WITH CHANGELOG`);

            if (issues.length > 0) {
              console.log(`✓ Board ${boardId} issue keys:`, issues.map(i => i.key).sort().join(', '));

              // Log parent vs child breakdown
              const parentCount = issues.filter(i => !i.fields.parent).length;
              const childCount = issues.filter(i => i.fields.parent).length;
              console.log(`✓ Board ${boardId} breakdown: ${parentCount} parents, ${childCount} children`);

              allIssues.push(...issues);
            } else {
              console.log(`⚠ Board ${boardId} sprint has 0 issues`);
            }
          } catch (fetchError: any) {
            console.error(`✗ Error fetching issues with changelog for board ${boardId}:`, fetchError.message);
            console.error(`✗ Full error:`, fetchError);

            // Fallback to old method without changelog
            console.log(`→ Falling back to fetch without changelog...`);
            try {
              const issues = await client.getActiveSprintIssues(boardId);
              console.log(`✓ Fallback: fetched ${issues.length} issues WITHOUT changelog`);
              allIssues.push(...issues);
            } catch (fallbackError: any) {
              console.error(`✗ Fallback also failed:`, fallbackError.message);
            }
          }
        } else {
          console.log(`✗ No sprint found for board ${boardId}`);
        }
      } catch (error: any) {
        console.error(`✗ Error processing board ${boardId}:`, error.message);
        console.error(`✗ Stack:`, error.stack);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total issues collected: ${allIssues.length}`);
    console.log(`Sprint info entries: ${sprintInfo.length}`);

    if (allIssues.length === 0) {
      const message = sprintInfo.length > 0
        ? `Sprint found but has no issues: ${sprintInfo.map(s => s.sprintName).join(', ')}`
        : 'No sprints found for the selected boards';

      return NextResponse.json({
        totalEstimate: 0,
        totalSpent: 0,
        timeline: [],
        issueCount: 0,
        completedIssuesByDate: [],
        sprintInfo,
        message,
      });
    }

    // Fetch worklogs for all issues (for accurate time spent tracking)
    console.log('\n=== Fetching worklogs for accurate time tracking ===');
    let worklogsByIssue: WorklogsByIssue[] = [];
    try {
      const issueKeys = allIssues.map(i => i.key);
      worklogsByIssue = await client.getWorklogsForIssues(issueKeys);
    } catch (worklogError: any) {
      console.error('Failed to fetch worklogs:', worklogError.message);
      console.log('Will use changelog-based time tracking as fallback');
    }

    // Calculate time data using sprint timeline WITH WORKLOGS for accuracy
    // Falls back to changelog-based history if worklogs are not available
    let timeData;
    if (sprintInfo.length > 0 && earliestSprintStart && latestSprintEnd) {
      if (worklogsByIssue.length > 0) {
        // Use worklogs for accurate time spent tracking
        console.log('Using WORKLOG-based time tracking (most accurate)');
        timeData = calculateTimeDataWithWorklogs(
          allIssues,
          earliestSprintStart,
          latestSprintEnd,
          sprintInfo[0].sprintId,
          worklogsByIssue,
          calculationMethod || 'original'
        );
      } else {
        // Fallback to changelog-based tracking
        console.log('Using CHANGELOG-based time tracking (fallback)');
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

    // Get completed issues grouped by date
    const completedIssuesByDate = getCompletedIssuesByDate(allIssues);

    // Build daily change summary
    let dailyChanges: DailyChangeSummary[] = [];
    if (earliestSprintStart && latestSprintEnd && worklogsByIssue.length > 0) {
      dailyChanges = buildDailyChangeSummary(
        allIssues,
        worklogsByIssue,
        earliestSprintStart,
        latestSprintEnd
      );
      console.log(`Built daily changes for ${dailyChanges.length} days`);
    }

    // Debug logging
    console.log('\n=== API BURNDOWN DEBUG ===');
    console.log('Total issues collected:', allIssues.length);
    console.log('Total estimate from calculateTimeData:', timeData.totalEstimate, 's');
    console.log('Total spent from calculateTimeData:', timeData.totalSpent, 's');
    console.log('Timeline data points:', timeData.timeline.length);

    // Manual calculation for verification
    const manualTotalEstimate = allIssues.reduce((sum, issue) =>
      sum + (issue.fields.timetracking?.originalEstimateSeconds || 0), 0
    );
    const completedIssuesCount = allIssues.filter(
      issue => issue.fields.status.statusCategory.key === 'done'
    ).length;
    console.log('Manual total estimate calculation:', manualTotalEstimate, 's');
    console.log('Completed issues count:', completedIssuesCount);
    console.log('Sprint dates:', earliestSprintStart, '->', latestSprintEnd);

    return NextResponse.json({
      ...timeData,
      issueCount: allIssues.length,
      completedIssuesByDate,
      dailyChanges,
      sprintInfo,
      sprintStartDate: earliestSprintStart,
      sprintEndDate: latestSprintEnd,
      allIssues,
    });
  } catch (error) {
    console.error('Error in burndown API:', error);
    return NextResponse.json(
      { error: 'Failed to calculate burndown data' },
      { status: 500 }
    );
  }
}
