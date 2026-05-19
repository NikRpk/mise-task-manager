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
import { groupTasksByDeadline } from '@/lib/reminders';
import { Task, UserSettings } from '@/types';

interface NotificationResult {
  userId: string;
  email: string;
  slack?: { success: boolean; message: string };
  tasksCount: number;
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
    logger.info('Processing daily reminders', { totalUsers: usersSnapshot.size });

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const settings = userDoc.data() as UserSettings;

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

        const projectsSnapshot = await adminDb.collection('projects').get();
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

        // Query tasks from top-level tasks collection where owner is user's email
        const tasksSnapshot = await adminDb
          .collection('tasks')
          .where('owner', '==', userEmail)
          .get();

        // Filter tasks to only include those in projects where user is a member
        tasksSnapshot.docs.forEach(taskDoc => {
          const taskData = taskDoc.data();
          if (userProjectIds.has(taskData.projectId)) {
            allTasks.push({ id: taskDoc.id, ...taskData } as Task);
          }
        });

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
          overdue: groupedTasks.overdue.length,
          today: groupedTasks.today.length,
          tomorrow: groupedTasks.tomorrow.length,
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
