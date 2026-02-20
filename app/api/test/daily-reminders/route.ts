/**
 * Test API for Daily Task Reminders
 * Sends sample notifications to a specific user with REAL tasks from database
 * 
 * POST /api/test/daily-reminders
 * Body: { email: string, userName?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendDailyTaskReminder } from '@/lib/slack-client';
import { adminDb } from '@/lib/firebase-admin';
import { Task, UserSettings } from '@/types';
import { startOfDay, addDays, isBefore, isSameDay, parseISO } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userName = 'User', userId } = body;

    if (!email && !userId) {
      return NextResponse.json(
        { error: 'Email or userId is required' },
        { status: 400 }
      );
    }

    // Find user by email OR userId
    let userDoc;
    let foundUserId: string = '';
    
    if (userId) {
      const doc = await adminDb.collection('users').doc(userId).get();
      if (doc.exists) {
        userDoc = doc;
        foundUserId = userId;
      }
    } else if (email) {
      const usersSnapshot = await adminDb.collection('users').where('email', '==', email).limit(1).get();
      if (!usersSnapshot.empty) {
        userDoc = usersSnapshot.docs[0];
        foundUserId = userDoc.id;
      }
    }
    
    if (!userDoc) {
      // Try to find ANY user with settings for testing
      const allUsersSnapshot = await adminDb.collection('users').limit(5).get();
      return NextResponse.json(
        { 
          error: 'User not found', 
          email,
          userId,
          hint: 'Try using one of these userIds',
          availableUsers: allUsersSnapshot.docs.map(doc => ({
            userId: doc.id,
            email: doc.data().email,
            displayName: doc.data().displayName,
          }))
        },
        { status: 404 }
      );
    }

    const settings = userDoc.data() as UserSettings;
    const userEmail = settings.email || email;
    const displayName = settings.displayName || userName;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User has no email configured', userId: foundUserId },
        { status: 400 }
      );
    }

    // Fetch all projects to build project names map and find user's projects
    const projectsSnapshot = await adminDb.collection('projects').get();
    const projectNames = new Map<string, string>();
    const userProjectIds = new Set<string>();

    for (const projectDoc of projectsSnapshot.docs) {
      const projectData = projectDoc.data();
      projectNames.set(projectDoc.id, projectData.name || 'Unnamed Project');

      const members = projectData.members || [];
      const userMember = members.find((m: { userId: string }) => m.userId === foundUserId);
      if (userMember) {
        userProjectIds.add(projectDoc.id);
      }
    }

    // Fetch user's tasks
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('owner', '==', userEmail)
      .get();

    const allTasks: Task[] = [];
    tasksSnapshot.docs.forEach(taskDoc => {
      const taskData = taskDoc.data();
      if (userProjectIds.has(taskData.projectId)) {
        allTasks.push({ id: taskDoc.id, ...taskData } as Task);
      }
    });

    // Group tasks by deadline
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hf-tasks.web.app';
    const customTemplate = settings.slackTemplates?.dailyReminder;

    let slackResult: { success: boolean; message: string };

    // Send Slack notification with real tasks
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
}
