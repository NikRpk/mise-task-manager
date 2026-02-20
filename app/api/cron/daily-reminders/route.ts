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
    console.log('=== DAILY REMINDERS CRON START ===');
    
    const schedulerHeader = request.headers.get('X-CloudScheduler-JobName');
    
    console.log('Scheduler header:', schedulerHeader);
    
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

    console.log('Fetching userSettings collection...');
    const usersSnapshot = await adminDb.collection('userSettings').get();
    console.log('UserSettings collection size:', usersSnapshot.size);
    
    logger.info('Checking user settings', { totalUsers: usersSnapshot.size });
    
    console.log('Starting loop through users...');

    console.log('Starting loop through users...');

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`Processing user ${userId}...`);
      const settings = userDoc.data() as UserSettings;
      console.log(`User ${userId} settings:`, JSON.stringify(settings.notifications?.dailyTaskReminder || null));

      const dailyReminderSettings = settings.notifications?.dailyTaskReminder;
      
      logger.info('User settings check', {
        userId,
        hasEmail: !!settings.email,
        hasNotifications: !!settings.notifications,
        hasDailyTaskReminder: !!dailyReminderSettings,
        slackEnabled: dailyReminderSettings?.slack,
      });
      
      if (!dailyReminderSettings || !dailyReminderSettings.slack) {
        console.log(`Skipping user ${userId} - slack not enabled`);
        logger.info('Skipping user - daily reminder not enabled', { userId });
        continue;
      }

      if (!settings.email) {
        console.log(`Skipping user ${userId} - no email`);
        logger.warn('Skipping user - no email in settings', { userId });
        continue;
      }

      console.log(`User ${userId} passed all checks! Processing...`);

      try {
        const userEmail = settings.email;
        const userName = settings.displayName || 'User';

        console.log(`Fetching projects for user ${userId}...`);
        const projectsSnapshot = await adminDb.collection('projects').get();
        console.log(`Found ${projectsSnapshot.size} projects total`);
        const allTasks: Task[] = [];
        const projectNames = new Map<string, string>();

        // Build map of project IDs where user is a member
        const userProjectIds = new Set<string>();
        for (const projectDoc of projectsSnapshot.docs) {
          const projectData = projectDoc.data();
          projectNames.set(projectDoc.id, projectData.name || 'Unnamed Project');

          const members = projectData.members || [];
          const userMember = members.find(
            (m: { userId: string }) => m.userId === userId
          );

          if (userMember) {
            userProjectIds.add(projectDoc.id);
          }
        }

        console.log(`User ${userId} is member of ${userProjectIds.size} projects`);

        // Query tasks from top-level tasks collection where owner is user's email
        const tasksSnapshot = await adminDb
          .collection('tasks')
          .where('owner', '==', userEmail)
          .get();

        console.log(`Found ${tasksSnapshot.size} tasks for user ${userId}`);

        // Filter tasks to only include those in projects where user is a member
        tasksSnapshot.docs.forEach(taskDoc => {
          const taskData = taskDoc.data();
          if (userProjectIds.has(taskData.projectId)) {
            allTasks.push({ id: taskDoc.id, ...taskData } as Task);
          }
        });

        console.log(`User ${userId} has ${allTasks.length} total tasks in their projects`);

        const groupedTasks = groupTasksByDeadline(allTasks);
        const totalRelevantTasks =
          groupedTasks.overdue.length +
          groupedTasks.today.length +
          groupedTasks.tomorrow.length;

        console.log(`User ${userId} has ${totalRelevantTasks} relevant tasks (overdue: ${groupedTasks.overdue.length}, today: ${groupedTasks.today.length}, tomorrow: ${groupedTasks.tomorrow.length})`);

        if (totalRelevantTasks === 0) {
          console.log(`Skipping user ${userId} - no relevant tasks`);
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
        console.log(`Successfully processed user ${userId}`);
        logger.info('Daily reminder processed', {
          userId,
          userEmail,
          tasksCount: totalRelevantTasks,
        });
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        logger.error('Failed to process user reminder', error as Error, { userId });
      }
    }

    console.log(`Finished processing all users. Total processed: ${results.length}`);

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
