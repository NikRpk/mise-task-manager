/**
 * Migration API: Convert task owners from displayName to email
 * Run once to migrate all existing tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const adminSecret = request.headers.get('x-admin-secret');
    
    // Security: Only allow with admin secret
    if (adminSecret !== process.env.ADMIN_MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting task owner migration');
    console.log('=== TASK OWNER MIGRATION START ===');

    // Get all people to build email mapping
    const peopleSnapshot = await adminDb.collection('people').get();
    const emailMap = new Map<string, string>();
    
    peopleSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.name && data.email) {
        emailMap.set(data.name, data.email);
      }
      // Also map displayName if available
      if (data.displayName && data.email) {
        emailMap.set(data.displayName, data.email);
      }
    });

    // Also get from userSettings (displayName → email)
    const userSettingsSnapshot = await adminDb.collection('userSettings').get();
    userSettingsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.displayName && data.email) {
        emailMap.set(data.displayName, data.email);
      }
    });

    console.log(`Built email map with ${emailMap.size} entries`);
    console.log('Email map:', Array.from(emailMap.entries()).slice(0, 5)); // Show first 5

    // Get all projects
    const projectsSnapshot = await adminDb.collection('projects').get();
    console.log(`Found ${projectsSnapshot.size} projects`);
    
    let totalTasks = 0;
    let migratedTasks = 0;
    let skippedTasks = 0;
    const errors: string[] = [];

    // Get all tasks from the top-level tasks collection
    const tasksSnapshot = await adminDb.collection('tasks').get();
    console.log(`Found ${tasksSnapshot.size} total tasks`);

    for (const taskDoc of tasksSnapshot.docs) {
      totalTasks++;
      const taskData = taskDoc.data();
      const currentOwner = taskData.owner;

      if (!currentOwner) {
        skippedTasks++;
        continue;
      }

      // Check if owner is already an email
      if (currentOwner.includes('@')) {
        skippedTasks++;
        continue;
      }

      // Try to find email for this display name
      const email = emailMap.get(currentOwner);
      
      if (email) {
        // Update task with email
        await adminDb
          .collection('tasks')
          .doc(taskDoc.id)
          .update({ owner: email });
        
        migratedTasks++;
        console.log(`Migrated task ${taskDoc.id}: "${currentOwner}" → "${email}"`);
      } else {
        errors.push(`No email found for owner: "${currentOwner}" (task: ${taskDoc.id})`);
        skippedTasks++;
      }
    }

    const summary = {
      totalTasks,
      migratedTasks,
      skippedTasks,
      errorCount: errors.length,
    };

    logger.info('Task owner migration completed', summary);

    return successResponse({
      success: true,
      totalTasks,
      migratedTasks,
      skippedTasks,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    return handleApiError(error, {
      endpoint: '/api/migrate/task-owners',
      method: 'POST',
    });
  }
}
