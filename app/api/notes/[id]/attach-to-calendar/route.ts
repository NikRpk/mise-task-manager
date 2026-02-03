/**
 * Attach note to Google Calendar event
 * Adds note content to the calendar event description
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';
import { attachNoteToCalendarEvent } from '@/lib/google-calendar';
import { Note } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req, user) => {
    try {
      const { id } = await params;
      
      // Get the note
      const noteRef = adminDb.collection('notes').doc(id);
      const noteDoc = await noteRef.get();
      
      if (!noteDoc.exists) {
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      
      const noteData = noteDoc.data() as Note;
      
      // Check if user owns this note
      if (noteData.createdBy !== user.uid) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      // Check if note is linked to a calendar event
      if (!noteData.calendarEventId) {
        return NextResponse.json(
          { error: 'Note is not linked to a calendar event' },
          { status: 400 }
        );
      }
      
      // Format note content for calendar
      const formattedContent = formatNoteForCalendar(noteData);
      
      // Attach to calendar event
      await attachNoteToCalendarEvent(user.uid, noteData.calendarEventId, formattedContent);
      
      return NextResponse.json({
        success: true,
        message: 'Note attached to calendar event',
      });
    } catch (error) {
      console.error('Error attaching note to calendar:', error);
      return NextResponse.json(
        { error: 'Failed to attach note to calendar' },
        { status: 500 }
      );
    }
  });
}

/**
 * Format note content for calendar event description
 */
function formatNoteForCalendar(note: Note): string {
  let formatted = `# ${note.title}\n\n`;
  
  // Add each section
  for (const [sectionId, content] of Object.entries(note.content)) {
    if (content.trim()) {
      // Convert HTML to plain text (simple version)
      const plainText = content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .trim();
      
      formatted += `## ${sectionId.toUpperCase()}\n${plainText}\n\n`;
    }
  }
  
  // Add tasks section
  if (note.tasks.length > 0) {
    formatted += `## TASKS\n`;
    note.tasks.forEach((task, index) => {
      const deadline = task.deadline ? ` (Due: ${new Date(task.deadline).toLocaleDateString('de-DE')})` : '';
      formatted += `${index + 1}. ${task.title} - ${task.owner}${deadline}\n`;
    });
  }
  
  return formatted;
}
