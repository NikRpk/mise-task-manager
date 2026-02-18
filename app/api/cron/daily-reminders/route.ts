/**
 * Daily Task Reminders Cron Job
 * Triggered by Cloud Scheduler at 8:00 AM Europe/Berlin
 * Sends Slack and Email reminders to users for overdue, today, and tomorrow tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';
import { sendDailyTaskReminder } from '@/lib/slack-client';
import { Task, UserSettings } from '@/types';
import { startOfDay, addDays, isBefore, isSameDay, parseISO } from 'date-fns';

interface NotificationResult {
  userId: string;
  email: string;
  slack?: { success: boolean; message: string };
  tasksCount: number;
}

/**
 * Filters tasks by deadline status
 */
function groupTasksByDeadline(tasks: Task[]): {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
} {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const overdue = tasks.filter(
    task =>
      task.deadline &&
      isBefore(parseISO(task.deadline), today) &&
      task.status !== 'done'
  );

  const todayTasks = tasks.filter(
    task =>
      task.deadline &&
      isSameDay(parseISO(task.deadline), today) &&
      task.status !== 'done'
  );

  const tomorrowTasks = tasks.filter(
    task =>
      task.deadline &&
      isSameDay(parseISO(task.deadline), tomorrow) &&
      task.status !== 'done'
  );

  return {
    overdue,
    today: todayTasks,
    tomorrow: tomorrowTasks,
  };
}

/**
 * POST /api/cron/daily-reminders
 * Sends daily task reminders to all users who have enabled them
 */
export async function POST(request: NextRequest) {
  try {
    const schedulerHeader = request.headers.get('X-CloudScheduler-JobName');
    
    if (schedulerHeader !== 'daily-task-reminders') {
      logger.warn('Unauthorized cron request', { 
        schedulerHeader: schedulerHeader || 'none' 
      });
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.apiRequest('POST', '/api/cron/daily-reminders');

    const results: NotificationResult[] = [];

    const usersSnapshot = await adminDb.collection('userSettings').get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const settings = userDoc.data() as UserSettings;

      const dailyReminderSettings = settings.notifications?.dailyTaskReminder;
      
      if (!dailyReminderSettings || !dailyReminderSettings.slack) {
        continue;
      }

      try {
        const userRef = await adminDb.collection('users').doc(userId).get();
        const userData = userRef.data();
        const userEmail = userData?.email;
        const userName = settings.displayName || userData?.displayName || 'User';

        if (!userEmail) {
          logger.warn('User has no email', { userId });
          continue;
        }

        const projectsSnapshot = await adminDb.collection('projects').get();
        const allTasks: Task[] = [];
        const projectNames = new Map<string, string>();

        for (const projectDoc of projectsSnapshot.docs) {
          const projectData = projectDoc.data();
          projectNames.set(projectDoc.id, projectData.name || 'Unnamed Project');

          const members = projectData.members || [];
          const userMember = members.find(
            (m: { userId: string }) => m.userId === userId
          );

          if (!userMember) {
            continue;
          }

          const tasksSnapshot = await adminDb
            .collection('projects')
            .doc(projectDoc.id)
            .collection('tasks')
            .where('owner', '==', userEmail)
            .get();

          tasksSnapshot.docs.forEach(taskDoc => {
            allTasks.push({ id: taskDoc.id, ...taskDoc.data() } as Task);
          });
        }

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

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hf-tasks.web.app';
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
        });
      } catch (error) {
        logger.error('Failed to process user reminder', error as Error, { userId });
      }
    }

    logger.apiResponse('POST', '/api/cron/daily-reminders', 200, undefined, {
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
      method: 'POST',
    });
  }
}
