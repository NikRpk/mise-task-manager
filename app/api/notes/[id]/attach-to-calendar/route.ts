/**
 * Attach note to Google Calendar event as a Google Doc
 * Creates a Google Doc in Drive and links it to the calendar event
 */

console.log('[MODULE] attach-to-calendar route.ts is loading...');

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';

console.log('[MODULE] Imports 1-3 successful');

import { attachNoteToCalendarEvent } from '@/lib/google-calendar';

console.log('[MODULE] google-calendar import successful');

import { Note } from '@/types';

console.log('[MODULE] All imports successful, defining POST function...');

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[ROUTE] POST function called!');
  
  return withAuth(request, async (req, user) => {
    console.log('=== ATTACH TO CALENDAR START ===');
    console.log('User:', user.uid, user.email);
    
    try {
      const { id } = await params;
      console.log('Note ID:', id);
      
      // Get the note
      const noteRef = adminDb.collection('notes').doc(id);
      const noteDoc = await noteRef.get();
      
      console.log('Note exists:', noteDoc.exists);
      
      if (!noteDoc.exists) {
        console.error('Note not found');
        return NextResponse.json(
          { error: 'Note not found' },
          { status: 404 }
        );
      }
      
      const noteData = noteDoc.data() as Note;
      console.log('Note data:', { 
        title: noteData.title, 
        hasCalendarId: !!noteData.calendarEventId,
        calendarEventId: noteData.calendarEventId 
      });
      
      // Check if user owns this note
      if (noteData.createdBy !== user.uid) {
        console.error('Access denied - not owner');
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      
      // Check if note is linked to a calendar event
      if (!noteData.calendarEventId) {
        console.error('No calendar event ID');
        return NextResponse.json(
          { error: 'Note is not linked to a calendar event' },
          { status: 400 }
        );
      }
      
      console.log('Formatting note content...');
      // Format note content for Google Doc
      const formattedContent = formatNoteForGoogleDoc(noteData, user.email);
      console.log('Content formatted, length:', formattedContent.length);
      
      console.log('Fetching user settings for folder ID...');
      // Get user's Drive folder setting
      const userSettingsDoc = await adminDb.collection('userSettings').doc(user.uid).get();
      let driveFolderId = userSettingsDoc.data()?.driveFolderId;
      
      // Extract folder ID from URL if user pasted full URL
      if (driveFolderId && driveFolderId.includes('drive.google.com')) {
        const match = driveFolderId.match(/folders\/([a-zA-Z0-9_-]+)/);
        if (match) {
          driveFolderId = match[1];
          console.log('Extracted folder ID from URL:', driveFolderId);
        }
      }
      
      console.log('Drive folder ID:', driveFolderId || 'none (using root)');
      
      console.log('Calling attachNoteToCalendarEvent...');
      // Create Google Doc and attach to calendar event
      await attachNoteToCalendarEvent(
        user.uid, 
        noteData.calendarEventId, 
        noteData.title, 
        formattedContent, 
        user.email,
        driveFolderId
      );
      
      console.log('=== ATTACH TO CALENDAR SUCCESS ===');
      return NextResponse.json({
        success: true,
        message: 'Note attached to calendar event as Google Doc',
      });
    } catch (error) {
      console.error('=== ATTACH TO CALENDAR ERROR ===');
      console.error('Error:', error);
      console.error('Error message:', (error as Error).message);
      console.error('Error stack:', (error as Error).stack);
      return NextResponse.json(
        { error: 'Failed to attach note to calendar' },
        { status: 500 }
      );
    }
  });
}

/**
 * Format note content for Google Doc (HTML format)
 */
function formatNoteForGoogleDoc(note: Note, userEmail: string): string {
  let html = `<h1>${note.title}</h1>\n`;
  html += `<p><em>Created: ${new Date(note.createdAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</em></p>\n`;
  
  // Add meeting information if available (compact format)
  if (note.calendarEventData) {
    html += `<p><strong>Event:</strong> ${note.calendarEventData.summary}</p>\n`;
    html += `<p><strong>Time:</strong> ${new Date(note.calendarEventData.start).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>\n`;
  }
  
  html += `<hr>\n\n`;
  
  // Add note content (already HTML from TipTap)
  html += note.content;
  html += `\n\n`;
  
  // Add tasks section
  if (note.tasks.length > 0) {
    html += `<hr>\n`;
    html += `<h2>Tasks</h2>\n`;
    html += `<ul>\n`;
    note.tasks.forEach((task) => {
      const deadline = task.deadline ? ` <em>(Due: ${new Date(task.deadline).toLocaleDateString('de-DE')})</em>` : '';
      const status = task.createdTaskId ? ' ✓' : '';
      html += `<li><strong>${task.title}</strong> - ${task.owner}${deadline}${status}</li>\n`;
    });
    html += `</ul>\n`;
  }
  
  html += `<hr>\n`;
  html += `<p><small>Added by ${userEmail}</small></p>`;
  
  return html;
}
