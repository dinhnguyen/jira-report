import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { domain, email, apiToken, issueKey } = await request.json();

    if (!domain || !email || !apiToken || !issueKey) {
      return NextResponse.json(
        { error: 'Missing required parameters: domain, email, apiToken, issueKey' },
        { status: 400 }
      );
    }

    console.log(`\n=== TESTING CHANGELOG API ===`);
    console.log(`Domain: ${domain}`);
    console.log(`Issue: ${issueKey}`);

    // Test 1: API v3 with expand=changelog
    console.log(`\n--- Test 1: API v3 with expand=changelog ---`);
    try {
      const client = axios.create({
        baseURL: `https://${domain}/rest/api/3`,
        auth: { username: email, password: apiToken },
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });

      const response = await client.get(`/issue/${issueKey}`, {
        params: {
          expand: 'changelog',
          fields: 'summary,status,created,updated',
        },
      });

      const issue = response.data;
      console.log(`✓ API v3 response received`);
      console.log(`Issue keys:`, Object.keys(issue));
      console.log(`Has changelog field:`, 'changelog' in issue);
      console.log(`Expand field:`, issue.expand);

      if (issue.changelog) {
        console.log(`Changelog histories length:`, issue.changelog.histories?.length || 0);
        console.log(`Changelog total:`, issue.changelog.total);
        console.log(`Changelog maxResults:`, issue.changelog.maxResults);
        console.log(`Changelog startAt:`, issue.changelog.startAt);
      }

      return NextResponse.json({
        test: 'API v3 with expand=changelog',
        success: true,
        issue: {
          key: issue.key,
          summary: issue.fields?.summary,
          hasChangelog: 'changelog' in issue,
          changelogTotal: issue.changelog?.total || 0,
          changelogHistoriesLength: issue.changelog?.histories?.length || 0,
          expand: issue.expand,
          topLevelKeys: Object.keys(issue),
        },
        rawChangelog: issue.changelog ? {
          total: issue.changelog.total,
          maxResults: issue.changelog.maxResults,
          startAt: issue.changelog.startAt,
          historiesCount: issue.changelog.histories?.length || 0,
          sampleHistory: issue.changelog.histories?.[0] || null,
        } : null,
      });
    } catch (error: any) {
      console.error(`✗ API v3 failed:`, error.message);
      if (error.response) {
        console.error(`Status:`, error.response.status);
        console.error(`Data:`, error.response.data);
      }

      return NextResponse.json({
        test: 'API v3 with expand=changelog',
        success: false,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
  } catch (error: any) {
    console.error('Error in test-changelog API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
