/**
 * Daily Task Reminders Cron Job
 * Triggered by Vercel Cron (see vercel.json) — sends Slack reminders to users
 * for overdue, today, and tomorrow tasks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { sendDailyTaskReminder } from '@/lib/slack-client';
import { groupTasksByDeadline } from '@/lib/reminders';
import { Task, UserSettings } from '@/types';
import { rowToTask, TaskRow } from '@/lib/db-mappers';

interface NotificationResult {
  userId: string;
  email: string;
  slack?: { success: boolean; message: string };
  tasksCount: number;
}

/**
 * Sends daily task reminders to all users who have enabled them.
 *
 * Vercel Cron sends a GET request with `Authorization: Bearer $CRON_SECRET`
 * for jobs defined in vercel.json. This route also accepts POST for manual
 * / test triggering. Either way, the bearer token is checked explicitly so
 * it can't be triggered by an arbitrary public request.
 */
async function handleDailyReminders(request: NextRequest, method: 'GET' | 'POST') {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      logger.warn('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.apiRequest(method, '/api/cron/daily-reminders');

    const db = getSupabaseAdmin();
    const results: NotificationResult[] = [];

    const { data: settingsRows, error: settingsError } = await db.from('mise_user_settings').select('*');
    if (settingsError) throw settingsError;

    logger.info('Processing daily reminders', { totalUsers: settingsRows?.length || 0 });

    for (const settingsRow of settingsRows || []) {
      const userId = settingsRow.user_id as string;
      const settings = {
        email: settingsRow.email,
        displayName: settingsRow.display_name,
        notifications: settingsRow.notifications,
        slackTemplates: settingsRow.slack_templates,
      } as UserSettings;

      const dailyReminderSettings = settings.notifications?.dailyTaskReminder;

      if (!dailyReminderSettings || !dailyReminderSettings.slack) {
        continue;
      }

      if (!settings.email) {
        logger.warn('Skipping user - no email in settings', { userId });
        continue;
      }

      try {
        const userEmail = settings.email;
        const userName = settings.displayName || 'User';

        const [{ data: projectRows }, { data: memberRows }, { data: taskRows }] = await Promise.all([
          db.from('projects').select('id, name'),
          db.from('project_members').select('project_id').eq('user_id', userId),
          db.from('tasks').select('*').eq('owner', userEmail),
        ]);

        const projectNames = new Map<string, string>();
        (projectRows || []).forEach(p => projectNames.set(p.id, p.name || 'Unnamed Project'));

        const userProjectIds = new Set((memberRows || []).map(m => m.project_id));

        const allTasks: Task[] = ((taskRows as TaskRow[]) || [])
          .filter(row => userProjectIds.has(row.project_id))
          .map(rowToTask);

        const groupedTasks = groupTasksByDeadline(allTasks);
        const totalRelevantTasks =
          groupedTasks.overdue.length +
          groupedTasks.today.length +
          groupedTasks.tomorrow.length;

        if (totalRelevantTasks === 0) {
          logger.info('No relevant tasks for user', { userId, userEmail });
          continue;
        }

        const result: NotificationResult = {
          userId,
          email: userEmail,
          tasksCount: totalRelevantTasks,
        };

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const customTemplate = settings.slackTemplates?.dailyReminder;

        result.slack = await sendDailyTaskReminder(
          userEmail,
          userName,
          groupedTasks,
          projectNames,
          appUrl,
          customTemplate
        );

        results.push(result);
        logger.info('Daily reminder processed', {
          userId,
          userEmail,
          tasksCount: totalRelevantTasks,
          overdue: groupedTasks.overdue.length,
          today: groupedTasks.today.length,
          tomorrow: groupedTasks.tomorrow.length,
        });
      } catch (error) {
        logger.error('Failed to process user reminder', error as Error, { userId });
      }
    }

    logger.apiResponse(method, '/api/cron/daily-reminders', 200, undefined, {
      totalUsers: results.length,
      totalNotifications: results.reduce(
        (sum, r) => sum + (r.slack?.success ? 1 : 0),
        0
      ),
    });

    return successResponse({
      success: true,
      processedUsers: results.length,
      results,
    });
  } catch (error) {
    return handleApiError(error, {
      endpoint: '/api/cron/daily-reminders',
      method,
    });
  }
}

export async function GET(request: NextRequest) {
  return handleDailyReminders(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleDailyReminders(request, 'POST');
}
