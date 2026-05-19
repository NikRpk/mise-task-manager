/**
 * Migration API: Rewrite all tasks with `owner == fromOwner` to `owner = toOwner`.
 *
 * This is the surgical companion to `/api/migrate/task-owners`: use it when
 * you only want to fix a single legacy owner value (e.g. displayName → email
 * for one specific user) without touching any other records.
 *
 * Security: Requires the same `x-admin-secret` header as the bulk migration.
 *
 * Request body:
 *   { "fromOwner": "Niklas Röpke", "toOwner": "niklas.roepke@hellofresh.de" }
 *   - `dryRun: true` returns what would change without writing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { handleApiError, successResponse } from '@/lib/api-errors';
import { logger } from '@/lib/logger';

const FIRESTORE_BATCH_LIMIT = 400;

interface MigrateBody {
  fromOwner?: string;
  toOwner?: string;
  dryRun?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const adminSecret = request.headers.get('x-admin-secret');
    if (adminSecret !== process.env.ADMIN_MIGRATION_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as MigrateBody;
    const fromOwner = body.fromOwner?.trim();
    const toOwner = body.toOwner?.trim();
    const dryRun = body.dryRun === true;

    if (!fromOwner || !toOwner) {
      return NextResponse.json(
        {
          error:
            'Both `fromOwner` and `toOwner` are required in the request body',
        },
        { status: 400 }
      );
    }

    if (fromOwner === toOwner) {
      return NextResponse.json(
        { error: '`fromOwner` and `toOwner` must be different' },
        { status: 400 }
      );
    }

    logger.info('Starting single-owner task migration', {
      fromOwner,
      toOwner,
      dryRun,
    });

    const snapshot = await adminDb
      .collection('tasks')
      .where('owner', '==', fromOwner)
      .get();

    const matchingTasks = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || data.description || '(no title)',
        projectId: data.projectId,
      };
    });

    if (dryRun || matchingTasks.length === 0) {
      return successResponse({
        success: true,
        dryRun,
        fromOwner,
        toOwner,
        matchedCount: matchingTasks.length,
        updatedCount: 0,
        tasks: matchingTasks,
      });
    }

    // Firestore caps a single batch at 500 writes; chunk to stay under.
    let updatedCount = 0;
    for (let i = 0; i < snapshot.docs.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = snapshot.docs.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = adminDb.batch();
      chunk.forEach(doc => {
        batch.update(doc.ref, {
          owner: toOwner,
          updatedAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      updatedCount += chunk.length;
    }

    logger.info('Single-owner task migration completed', {
      fromOwner,
      toOwner,
      updatedCount,
    });

    return successResponse({
      success: true,
      dryRun: false,
      fromOwner,
      toOwner,
      matchedCount: matchingTasks.length,
      updatedCount,
      tasks: matchingTasks,
    });
  } catch (error) {
    return handleApiError(error, {
      endpoint: '/api/migrate/single-owner',
      method: 'POST',
    });
  }
}
