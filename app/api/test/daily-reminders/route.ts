/**
 * Test API for Daily Task Reminders
 * Sends sample notifications to a specific user with REAL tasks from database
 *
 * POST /api/test/daily-reminders
 * Body: { email: string, userName?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendDailyTaskReminder } from '@/lib/slack-client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { Task } from '@/types';
import { startOfDay, addDays, isBefore, isSameDay, parseISO } from 'date-fns';
import { withAuth } from '@/lib/auth-middleware';
import { rowToTask, TaskRow } from '@/lib/db-mappers';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
  try {
    const body = await req.json();
    const { email, userName = 'User', userId } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Email or userId is required' },
        { status: 400 }
      );
    }

    const db = getSupabaseAdmin();

    let foundUserId: string = '';
    let settingsRow: { email?: string; display_name?: string; slack_templates?: unknown } | null = null;

    if (userId) {
      const { data } = await db.from('mise_user_settings').select('*').eq('user_id', userId).maybeSingle();
      if (data) {
        settingsRow = data;
        foundUserId = userId;
      }
    } else if (email) {
      const { data } = await db.from('mise_user_settings').select('*').eq('email', email).limit(1).maybeSingle();
      if (data) {
        settingsRow = data;
        foundUserId = data.user_id;
      }
    }

    if (!settingsRow) {
      const { data: sampleUsers } = await db.from('mise_user_settings').select('user_id, email, display_name').limit(5);
      return NextResponse.json(
        {
          error: 'User not found',
          email,
          userId,
          hint: 'Try using one of these userIds',
          availableUsers: (sampleUsers || []).map(u => ({
            userId: u.user_id,
            email: u.email,
            displayName: u.display_name,
          })),
        },
        { status: 404 }
      );
    }

    const userEmail = settingsRow.email || email;
    const displayName = settingsRow.display_name || userName;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User has no email configured', userId: foundUserId },
        { status: 400 }
      );
    }

    const [{ data: projectRows }, { data: memberRows }, { data: taskRows }] = await Promise.all([
      db.from('projects').select('id, name'),
      db.from('project_members').select('project_id').eq('user_id', foundUserId),
      db.from('tasks').select('*').eq('owner', userEmail),
    ]);

    const projectNames = new Map<string, string>();
    (projectRows || []).forEach(p => projectNames.set(p.id, p.name || 'Unnamed Project'));
    const userProjectIds = new Set((memberRows || []).map(m => m.project_id));

    const allTasks: Task[] = ((taskRows as TaskRow[]) || [])
      .filter(row => userProjectIds.has(row.project_id))
      .map(rowToTask);

    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    const groupedTasks = {
      overdue: allTasks.filter(
        task =>
          task.deadline &&
          isBefore(parseISO(task.deadline), today) &&
          task.status !== 'done'
      ),
      today: allTasks.filter(
        task =>
          task.deadline &&
          isSameDay(parseISO(task.deadline), today) &&
          task.status !== 'done'
      ),
      tomorrow: allTasks.filter(
        task =>
          task.deadline &&
          isSameDay(parseISO(task.deadline), tomorrow) &&
          task.status !== 'done'
      ),
    };

    const totalTasks = groupedTasks.overdue.length + groupedTasks.today.length + groupedTasks.tomorrow.length;

    if (totalTasks === 0) {
      return NextResponse.json({
        success: false,
        message: 'No tasks found for this user',
        recipient: email,
        taskCounts: {
          overdue: 0,
          today: 0,
          tomorrow: 0,
        }
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const slackTemplates = settingsRow.slack_templates as { dailyReminder?: string } | undefined;
    const customTemplate = slackTemplates?.dailyReminder;

    let slackResult: { success: boolean; message: string };

    try {
      slackResult = await sendDailyTaskReminder(
        userEmail,
        displayName,
        groupedTasks,
        projectNames,
        appUrl,
        customTemplate
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
      recipient: userEmail,
      userId: foundUserId,
      usedCustomTemplate: !!customTemplate,
      taskCounts: {
        overdue: groupedTasks.overdue.length,
        today: groupedTasks.today.length,
        tomorrow: groupedTasks.tomorrow.length,
        total: totalTasks,
      }
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
  });
}
