/**
 * Slack Notification API Endpoint
 * Sends meeting notes to Slack users
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendNoteToAttendees } from '@/lib/slack-client';
import { logger } from '@/lib/logger';
import { NoteTask } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const { noteTitle, noteContent, noteUrl, meetingDate, allTasks, attendees } = body;
    
    if (!noteTitle || typeof noteTitle !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid noteTitle' },
        { status: 400 }
      );
    }
    
    if (!noteContent || typeof noteContent !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid noteContent' },
        { status: 400 }
      );
    }
    
    if (!noteUrl || typeof noteUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid noteUrl' },
        { status: 400 }
      );
    }
    
    if (!meetingDate || typeof meetingDate !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid meetingDate' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(allTasks)) {
      return NextResponse.json(
        { error: 'Missing or invalid allTasks array' },
        { status: 400 }
      );
    }
    
    if (!Array.isArray(attendees) || attendees.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid attendees array' },
        { status: 400 }
      );
    }
    
    // Validate attendees structure
    for (const attendee of attendees) {
      if (!attendee.email || typeof attendee.email !== 'string') {
        return NextResponse.json(
          { error: 'Invalid attendee email' },
          { status: 400 }
        );
      }
      
      if (!Array.isArray(attendee.tasks)) {
        return NextResponse.json(
          { error: 'Invalid attendee tasks array' },
          { status: 400 }
        );
      }
    }
    
    logger.info('Sending Slack notifications', { 
      noteTitle, 
      attendeeCount: attendees.length 
    });
    
    // Send notifications
    const results = await sendNoteToAttendees(
      {
        title: noteTitle,
        content: noteContent,
        noteUrl,
        meetingDate,
        allTasks: allTasks as NoteTask[],
      },
      attendees
    );
    
    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    logger.info('Slack notifications completed', { 
      successCount, 
      failureCount,
      results: results.map(r => ({ email: r.email, success: r.success }))
    });
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: attendees.length,
        successful: successCount,
        failed: failureCount,
      },
    });
    
  } catch (error: any) {
    logger.error('Slack notification endpoint error', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
