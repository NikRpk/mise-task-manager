/**
 * People Clear API - Clear people database and optionally re-sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
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

      const db = getSupabaseAdmin();

      let query = db.from('people').delete().select('email');
      if (source !== 'all') {
        query = query.eq('source', source);
      } else {
        query = query.neq('email', ''); // Supabase requires a filter on delete
      }

      const { data: deletedRows, error } = await query;
      if (error) throw error;

      const deletedCount = deletedRows?.length || 0;

      logger.info('Cleared people database', {
        userId: user.uid,
        source,
        deletedCount,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully deleted ${deletedCount} people from ${source} source`,
        deletedCount,
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
