import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira-client';
import { calculateTimeData, getCompletedIssuesByDate } from '@/lib/time-calculator';
import { JiraIssue } from '@/types/jira';

export async function POST(request: Request) {
  try {
    const { boardIds, domain, email, apiToken } = await request.json();

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
    const sprintInfo: Array<{ boardId: string; sprintName: string; startDate?: string; endDate?: string }> = [];
    let earliestSprintStart: string | undefined;
    let latestSprintEnd: string | undefined;

    console.log(`Processing ${boardIds.length} boards:`, boardIds);

    for (const boardId of boardIds) {
      try {
        console.log(`\n=== Processing board ${boardId} ===`);
        const activeSprint = await client.getActiveSprint(boardId);
        if (activeSprint) {
          console.log(`✓ Board ${boardId} has active sprint: ${activeSprint.name}`);
          sprintInfo.push({
            boardId,
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

          const issues = await client.getActiveSprintIssues(boardId);
          console.log(`✓ Board ${boardId} fetched ${issues.length} issues`);
          console.log(`✓ Board ${boardId} issue keys:`, issues.map(i => i.key).sort().join(', '));

          // Log parent vs child breakdown
          const parentCount = issues.filter(i => !i.fields.parent).length;
          const childCount = issues.filter(i => i.fields.parent).length;
          console.log(`✓ Board ${boardId} breakdown: ${parentCount} parents, ${childCount} children`);

          allIssues.push(...issues);
        } else {
          console.log(`✗ No active sprint found for board ${boardId}`);
        }
      } catch (error) {
        console.error(`✗ Error fetching active sprint issues for board ${boardId}:`, error);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total issues collected: ${allIssues.length}`);
    console.log(`Sprint info entries: ${sprintInfo.length}`);

    if (allIssues.length === 0) {
      return NextResponse.json({
        totalEstimate: 0,
        totalSpent: 0,
        timeline: [],
        issueCount: 0,
        completedIssuesByDate: [],
        sprintInfo,
        message: 'No active sprints found for the selected boards',
      });
    }

    // Calculate time data using sprint timeline
    const timeData = calculateTimeData(allIssues, earliestSprintStart, latestSprintEnd);

    // Get completed issues grouped by date
    const completedIssuesByDate = getCompletedIssuesByDate(allIssues);

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
