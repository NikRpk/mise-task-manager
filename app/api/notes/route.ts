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
      const notesRef = adminDb.collection('notes');
      
      // Only fetch notes created by this user
      const query = notesRef.where('createdBy', '==', user.uid);
      
      const snapshot = await query.get();
      
      const notes: Note[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Omit<Note, 'id'>
      }));
      
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
        calendarEventId: body.calendarEventId || null,
        calendarEventLink: body.calendarEventLink || null,
        calendarEventData: body.calendarEventData || null,
        googleDocId: null, // Will be set when doc is created
        googleDocUrl: null, // Will be set when doc is created
        recurringEventId: body.recurringEventId || null, // Recurring event series ID
        recurringInstanceDate: body.recurringInstanceDate || null, // Instance date
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
