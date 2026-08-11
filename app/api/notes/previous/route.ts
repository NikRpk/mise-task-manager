/**
 * Fetch Previous Notes API
 * Get up to 5 previous instances of a recurring meeting series
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { rowToNote, NoteRow } from '@/lib/db-mappers';

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
        const db = getSupabaseAdmin();
        const { data: rows, error } = await db
          .from('notes')
          .select('*')
          .eq('created_by', user.uid)
          .eq('recurring_event_id', recurringEventId)
          .lt('recurring_instance_date', instanceDate)
          .order('recurring_instance_date', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (rows && rows.length > 0) {
          const previousNotes = (rows as NoteRow[]).map(rowToNote);
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
