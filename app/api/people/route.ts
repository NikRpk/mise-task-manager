/**
 * People API - Manage organization contacts database
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rowToPerson, PersonRow } from '@/lib/db-mappers';

/**
 * GET /api/people - Fetch all people from database
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const db = getSupabaseAdmin();
      const { data: rows, error } = await db
        .from('people')
        .select('*')
        .order('display_name')
        .limit(1000);

      if (error) throw error;

      const people = ((rows as PersonRow[]) || []).map(rowToPerson);

      return NextResponse.json({ people });
    } catch (error) {
      console.error('Failed to fetch people:', error);
      return NextResponse.json(
        { error: 'Failed to fetch people' },
        { status: 500 }
      );
    }
  });
}
