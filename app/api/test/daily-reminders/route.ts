/**
 * Test API for Daily Task Reminders
 * Sends sample notifications to a specific user
 * 
 * POST /api/test/daily-reminders
 * Body: { email: string, userName?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendDailyTaskReminder } from '@/lib/slack-client';
import { Task } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userName = 'User' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() - 2);

    // Sample task data
    const sampleTasks: {
      overdue: Task[];
      today: Task[];
      tomorrow: Task[];
    } = {
      overdue: [
        {
          id: '1',
          title: 'Fix production bug',
          description: 'Critical bug in payment processing',
          projectId: 'proj1',
          priority: 'high',
          status: 'in-progress',
          owner: email,
          deadline: overdueDate.toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subTasks: [],
        },
        {
          id: '2',
          title: 'Review PR #1234',
          description: 'Code review for new feature',
          projectId: 'proj2',
          priority: 'medium',
          status: 'review',
          owner: email,
          deadline: new Date(today.getTime() - 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subTasks: [],
        },
      ],
      today: [
        {
          id: '3',
          title: 'Update documentation',
          description: 'Update API documentation',
          projectId: 'proj1',
          priority: 'medium',
          status: 'todo',
          owner: email,
          deadline: today.toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subTasks: [],
        },
        {
          id: '4',
          title: 'Client presentation',
          description: 'Present Q1 results to stakeholders',
          projectId: 'proj3',
          priority: 'high',
          status: 'todo',
          owner: email,
          deadline: today.toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subTasks: [],
        },
        {
          id: '5',
          title: 'Code review',
          description: 'Review backend refactoring',
          projectId: 'proj2',
          priority: 'low',
          status: 'todo',
          owner: email,
          deadline: today.toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subTasks: [],
        },
      ],
      tomorrow: [
        {
          id: '6',
          title: 'Team standup preparation',
          description: 'Prepare sprint updates',
          projectId: 'proj1',
          priority: 'medium',
          status: 'todo',
          owner: email,
          deadline: tomorrow.toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subTasks: [],
        },
      ],
    };

    // Project names mapping
    const projectNames = new Map([
      ['proj1', 'Project Alpha'],
      ['proj2', 'Backend Team'],
      ['proj3', 'Sales Team'],
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hf-tasks.web.app';

    let slackResult: { success: boolean; message: string };

    // Send Slack notification
    try {
      slackResult = await sendDailyTaskReminder(
        email,
        userName,
        sampleTasks,
        projectNames,
        appUrl
      );
    } catch (error) {
      slackResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return NextResponse.json({
      success: slackResult.success,
      message: slackResult.success ? 'Test Slack notification sent successfully' : 'Failed to send Slack notification',
      slack: slackResult,
      recipient: email,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to send test notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
