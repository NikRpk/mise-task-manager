/**
 * Notes API
 * CRUD operations for meeting notes
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { Note } from '@/types';

export async function GET(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const projectId = searchParams.get('projectId');
      
      const notesRef = adminDb.collection('notes');
      let query: FirebaseFirestore.Query = notesRef;
      
      // Only fetch notes created by this user
      query = query.where('createdBy', '==', user.uid);
      
      // Filter by project if specified
      if (projectId) {
        query = query.where('projectId', '==', projectId);
      }
      
      const snapshot = await query.get();
      
      const notes: Note[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Note[];
      
      // Sort in memory (client-side) to avoid needing a Firestore index
      notes.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      
      return NextResponse.json(notes);
    } catch (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await request.json();
      
      const newNote: Omit<Note, 'id'> = {
        title: body.title || 'Untitled Note',
        content: body.content || {},
        tasks: body.tasks || [],
        projectId: body.projectId || null,
        calendarEventId: body.calendarEventId || null,
        calendarEventLink: body.calendarEventLink || null,
        templateId: body.templateId || 'default',
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const docRef = await adminDb.collection('notes').add(newNote);
      
      return NextResponse.json(
        { id: docRef.id, ...newNote },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating note:', error);
      return NextResponse.json(
        { error: 'Failed to create note' },
        { status: 500 }
      );
    }
  });
}
