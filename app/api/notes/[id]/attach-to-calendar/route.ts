/**
 * Attach note to Google Calendar event as a Google Doc
 * Creates a Google Doc in Drive and links it to the calendar event
 */

console.log('[MODULE] attach-to-calendar route.ts is loading...');

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { adminDb } from '@/lib/firebase-admin';

console.log('[MODULE] Imports 1-3 successful');

import { attachNoteToCalendarEvent, updateGoogleDoc } from '@/lib/google-calendar';

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
      
      // Check if doc already exists
      const hasExistingDoc = !!noteData.googleDocId;
      
      if (hasExistingDoc) {
        console.log('Updating existing Google Doc:', noteData.googleDocId);
        
        // Update existing doc
        await updateGoogleDoc(
          user.uid,
          noteData.googleDocId!,
          noteData.title,
          formattedContent,
          user.email
        );
        
        console.log('=== UPDATE GOOGLE DOC SUCCESS ===');
        return NextResponse.json({
          success: true,
          message: 'Google Doc updated successfully',
          docId: noteData.googleDocId,
          docUrl: noteData.googleDocUrl,
        });
      } else {
        console.log('Creating new Google Doc');
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
        const { docId, docUrl } = await attachNoteToCalendarEvent(
          user.uid, 
          noteData.calendarEventId, 
          noteData.title, 
          formattedContent, 
          user.email,
          driveFolderId
        );
        
        console.log('Google Doc created:', { docId, docUrl });
        
        // Save doc ID and URL back to note
        await noteRef.update({
          googleDocId: docId,
          googleDocUrl: docUrl,
          updatedAt: new Date().toISOString(),
        });
        
        console.log('Note updated with Google Doc info');
        console.log('=== ATTACH TO CALENDAR SUCCESS ===');
        
        return NextResponse.json({
          success: true,
          message: 'Note attached to calendar event as Google Doc',
          docId,
          docUrl,
        });
      }
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
  let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>';
  
  // Header: "Notes name [Link]" where Link is hyperlinked to calendar event
  if (note.calendarEventData) {
    html += `<h1 style="font-size: 24pt; font-weight: bold; margin-bottom: 8pt;">${note.title} <a href="${note.calendarEventData.htmlLink}" style="color: #1a73e8;">[Link]</a></h1>`;
  } else {
    html += `<h1 style="font-size: 24pt; font-weight: bold; margin-bottom: 8pt;">${note.title}</h1>`;
  }
  
  // Created date in dd.MM.yyyy format
  const createdDate = new Date(note.createdAt).toLocaleDateString('de-DE');
  html += `<p style="margin-bottom: 12pt;"><strong>Created:</strong> ${createdDate}</p>`;
  
  // Attendees list with response status
  if (note.calendarEventData?.attendees && note.calendarEventData.attendees.length > 0) {
    html += `<p style="margin-top: 12pt; margin-bottom: 4pt;"><strong>Attendees:</strong></p><ul style="margin-top: 0; margin-bottom: 12pt;">`;
    note.calendarEventData.attendees.forEach(attendee => {
      const displayName = attendee.displayName || attendee.email;
      const status = attendee.responseStatus 
        ? ` (${attendee.responseStatus.charAt(0).toUpperCase() + attendee.responseStatus.slice(1)})`
        : '';
      html += `<li style="margin-bottom: 4pt;">${displayName}${status}</li>`;
    });
    html += `</ul>`;
  }
  
  html += `<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16pt 0;">`;
  
  // Add note content (already HTML from TipTap) with styling
  html += `<div style="margin: 16pt 0;">${note.content}</div>`;
  
  // Add tasks section
  if (note.tasks.length > 0) {
    html += `<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16pt 0;">`;
    html += `<h2 style="font-size: 18pt; font-weight: bold; margin-top: 16pt; margin-bottom: 8pt;">Tasks</h2>`;
    html += `<ul style="margin-top: 0; margin-bottom: 12pt;">`;
    note.tasks.forEach((task) => {
      const deadline = task.deadline ? ` <em>(Due: ${new Date(task.deadline).toLocaleDateString('de-DE')})</em>` : '';
      const status = task.createdTaskId ? ' ✓' : '';
      html += `<li style="margin-bottom: 6pt;"><strong>${task.title}</strong> - ${task.owner}${deadline}${status}</li>`;
    });
    html += `</ul>`;
  }
  
  html += `<hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16pt 0;">`;
  html += `<p style="font-size: 9pt; color: #666; margin-top: 16pt;"><em>Added by ${userEmail}</em></p>`;
  html += '</body></html>';
  
  return html;
}
