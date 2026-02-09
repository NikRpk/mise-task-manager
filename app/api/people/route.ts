/**
 * People API - Manage organization contacts database
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { Person } from '@/types';

/**
 * GET /api/people - Fetch all people from database
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async () => {
    try {
      const peopleSnapshot = await adminDb
        .collection('people')
        .orderBy('displayName')
        .limit(1000)
        .get();
      
      const people: Person[] = peopleSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      } as Person));
      
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
