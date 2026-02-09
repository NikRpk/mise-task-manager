/**
 * Fetch Previous Note API
 * Get the most recent previous note for a recurring event series
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const recurringEventId = searchParams.get('recurringEventId');
      const instanceDate = searchParams.get('instanceDate');
      
      console.log('[PREVIOUS NOTE API] Request received:', {
        userId: user.uid,
        recurringEventId,
        instanceDate
      });
      
      if (!recurringEventId || !instanceDate) {
        console.log('[PREVIOUS NOTE API] Missing parameters');
        return NextResponse.json(
          { error: 'Missing recurringEventId or instanceDate parameters' },
          { status: 400 }
        );
      }
      
      try {
        console.log('[PREVIOUS NOTE API] Querying Firestore...');
        
        // Query for previous instance of the same recurring event
        const previousNotesQuery = await adminDb
          .collection('notes')
          .where('createdBy', '==', user.uid)
          .where('recurringEventId', '==', recurringEventId)
          .where('recurringInstanceDate', '<', instanceDate)
          .orderBy('recurringInstanceDate', 'desc')
          .limit(1)
          .get();
        
        console.log('[PREVIOUS NOTE API] Query result:', {
          empty: previousNotesQuery.empty,
          size: previousNotesQuery.size
        });
        
        if (!previousNotesQuery.empty) {
          const previousNoteDoc = previousNotesQuery.docs[0];
          const previousNote = {
            id: previousNoteDoc.id,
            ...previousNoteDoc.data()
          };
          
          console.log('[PREVIOUS NOTE API] Found previous note:', {
            id: previousNote.id,
            title: previousNote.title,
            recurringInstanceDate: previousNote.recurringInstanceDate
          });
          
          return NextResponse.json({ previousNote });
        }
        
        console.log('[PREVIOUS NOTE API] No previous note found');
        // No previous note found
        return NextResponse.json({ previousNote: null });
      } catch (queryError) {
        console.error('[PREVIOUS NOTE API] Error querying previous note:', queryError);
        // If query fails (e.g., missing index), return null
        return NextResponse.json({ previousNote: null });
      }
    } catch (error) {
      console.error('[PREVIOUS NOTE API] Error in previous note API:', error);
      return NextResponse.json(
        { error: 'Failed to fetch previous note' },
        { status: 500 }
      );
    }
  });
}
