import { NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira-client';

export async function GET() {
  try {
    const domain = process.env.NEXT_PUBLIC_JIRA_DOMAIN;
    const email = process.env.NEXT_PUBLIC_JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;

    if (!domain || !email || !apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira configuration. Please check your .env.local file' },
        { status: 500 }
      );
    }

    const client = new JiraClient(domain, email, apiToken);
    const boards = await client.getAllBoards();

    return NextResponse.json(boards);
  } catch (error: any) {
    console.error('Error in boards API:', error);
    console.error('Error details:', error.response?.data || error.message);
    return NextResponse.json(
      {
        error: 'Failed to fetch boards from Jira',
        details: error.response?.data || error.message,
        status: error.response?.status
      },
      { status: 500 }
    );
  }
}
