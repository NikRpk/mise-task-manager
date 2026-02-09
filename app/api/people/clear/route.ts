/**
 * People Clear API - Clear people database and optionally re-sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

/**
 * DELETE /api/people/clear - Clear all people from database
 * Query params:
 *   - source: 'calendar' | 'workspace' | 'all' (default: 'calendar')
 */
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const source = searchParams.get('source') || 'calendar';
      
      let query = adminDb.collection('people');
      
      // Filter by source if not clearing all
      if (source !== 'all') {
        query = query.where('source', '==', source) as any;
      }
      
      const snapshot = await query.get();
      
      // Firestore batch limit is 500 operations - need to chunk for large datasets
      const docs = snapshot.docs;
      const BATCH_SIZE = 500;
      let deletedCount = 0;
      
      // Delete in chunks of 500
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const chunk = docs.slice(i, i + BATCH_SIZE);
        const batch = adminDb.batch();
        
        chunk.forEach(doc => {
          batch.delete(doc.ref);
          deletedCount++;
        });
        
        await batch.commit();
      }
      
      logger.info('Cleared people database', { 
        userId: user.uid, 
        source, 
        deletedCount 
      });
      
      return NextResponse.json({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} people from ${source} source`,
        deletedCount 
      });
    } catch (error) {
      logger.error('Failed to clear people database', error as Error, {
        userId: user.uid,
      });
      return NextResponse.json(
        { error: 'Failed to clear people database' },
        { status: 500 }
      );
    }
  });
}
