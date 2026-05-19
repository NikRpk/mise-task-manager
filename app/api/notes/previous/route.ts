/**
 * Fetch Previous Notes API
 * Get up to 5 previous instances of a recurring meeting series
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const recurringEventId = searchParams.get('recurringEventId');
      const instanceDate = searchParams.get('instanceDate');
      
      if (!recurringEventId || !instanceDate) {
        return NextResponse.json(
          { error: 'Missing recurringEventId or instanceDate parameters' },
          { status: 400 }
        );
      }
      
      try {
        const previousNotesQuery = await adminDb
          .collection('notes')
          .where('createdBy', '==', user.uid)
          .where('recurringEventId', '==', recurringEventId)
          .where('recurringInstanceDate', '<', instanceDate)
          .orderBy('recurringInstanceDate', 'desc')
          .limit(5)
          .get();
        
        if (!previousNotesQuery.empty) {
          const previousNotes = previousNotesQuery.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          return NextResponse.json({ previousNotes });
        }
        
        return NextResponse.json({ previousNotes: [] });
      } catch (queryError) {
        logger.error('Error querying previous notes', queryError as Error, {
          recurringEventId,
          userId: user.uid,
        });
        return NextResponse.json({ previousNotes: [] });
      }
    } catch (error) {
      logger.error('Error in previous notes API', error as Error, { userId: user.uid });
      return NextResponse.json(
        { error: 'Failed to fetch previous notes' },
        { status: 500 }
      );
    }
  });
}
