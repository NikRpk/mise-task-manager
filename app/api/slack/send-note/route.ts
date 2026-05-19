/**
 * Slack Notification API Endpoint
 * Sends meeting notes to Slack users
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendNoteToAttendees } from '@/lib/slack-client';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { NoteTask } from '@/types';
import { withAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const body = await req.json();

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
        attendeeCount: attendees.length,
      });

      // Fetch custom template from first attendee's settings (if available)
      // In practice, you might want to fetch each user's template individually
      let customTemplate: string | undefined;
      try {
        const firstAttendee = attendees[0];
        // Try to get user ID from email
        const userSnapshot = await adminDb
          .collection('users')
          .where('email', '==', firstAttendee.email)
          .limit(1)
          .get();

        if (!userSnapshot.empty) {
          const userId = userSnapshot.docs[0].id;
          const userSettingsDoc = await adminDb.collection('userSettings').doc(userId).get();
          const settings = userSettingsDoc.data();
          customTemplate = settings?.slackTemplates?.meetingNote;
        }
      } catch (error) {
        logger.warn('Could not fetch custom Slack template, using default', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Send notifications
      const results = await sendNoteToAttendees(
        {
          title: noteTitle,
          content: noteContent,
          noteUrl,
          meetingDate,
          allTasks: allTasks as NoteTask[],
        },
        attendees,
        customTemplate
      );

      // Count successes and failures
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      logger.info('Slack notifications completed', {
        successCount,
        failureCount,
        totalRecipients: results.length,
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
    } catch (error) {
      const err = error as Error & { message: string };
      logger.error('Slack notification endpoint error', err);

      return NextResponse.json(
        {
          error: 'Internal server error',
          message: err.message,
        },
        { status: 500 }
      );
    }
  });
}
