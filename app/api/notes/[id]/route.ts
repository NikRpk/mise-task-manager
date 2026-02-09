/**
 * Single note API
 * Get, update, delete specific note
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const includePrevious = searchParams.get('includePrevious') === 'true';
      
      const noteRef = adminDb.collection('notes').doc(id);
      const noteDoc = await noteRef.get();
      
      if (!noteDoc.exists) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      
      const noteData = noteDoc.data();
      
      // Check if user owns this note
      if (noteData?.createdBy !== user.uid) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      const currentNote = { id: noteDoc.id, ...noteData };
      
      // If includePrevious is requested and this note is part of a recurring series
      if (includePrevious && noteData?.recurringEventId && noteData?.recurringInstanceDate) {
        try {
          // Query for previous instance of the same recurring event
          const previousNotesQuery = await adminDb
            .collection('notes')
            .where('createdBy', '==', user.uid)
            .where('recurringEventId', '==', noteData.recurringEventId)
            .where('recurringInstanceDate', '<', noteData.recurringInstanceDate)
            .orderBy('recurringInstanceDate', 'desc')
            .limit(1)
            .get();
          
          if (!previousNotesQuery.empty) {
            const previousNoteDoc = previousNotesQuery.docs[0];
            const previousNote = {
              id: previousNoteDoc.id,
              ...previousNoteDoc.data()
            };
            
            return NextResponse.json({
              currentNote,
              previousNote
            });
          }
        } catch (queryError) {
          console.error('Error fetching previous note:', queryError);
          // If query fails (e.g., missing index), just return current note
          return NextResponse.json({ currentNote, previousNote: null });
        }
      }
      
      return NextResponse.json({ currentNote, previousNote: null });
    } catch (error) {
      console.error('Error fetching note:', error);
      return NextResponse.json(
        { error: 'Failed to fetch note' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const body = await request.json();
      
      const noteRef = adminDb.collection('notes').doc(id);
      const noteDoc = await noteRef.get();
      
      if (!noteDoc.exists) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      
      const noteData = noteDoc.data();
      
      // Check if user owns this note
      if (noteData?.createdBy !== user.uid) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      // Update note
      const updatedNote = {
        ...body,
        updatedAt: new Date().toISOString(),
        createdBy: noteData.createdBy, // Preserve original creator
        createdAt: noteData.createdAt, // Preserve creation date
      };
      
      await noteRef.update(updatedNote);
      
      return NextResponse.json({ id, ...updatedNote });
    } catch (error) {
      console.error('Error updating note:', error);
      return NextResponse.json(
        { error: 'Failed to update note' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      const noteRef = adminDb.collection('notes').doc(id);
      const noteDoc = await noteRef.get();
      
      if (!noteDoc.exists) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      
      const noteData = noteDoc.data();
      
      // Check if user owns this note
      if (noteData?.createdBy !== user.uid) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      await noteRef.delete();
      
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }
  });
}
