import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { logger } from '@/lib/logger';
import { withAuth } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const body = await req.json();

      if (!body.type || !body.message) {
        return NextResponse.json(
          { error: 'Missing required fields: type and message are required.' },
          { status: 400 }
        );
      }

      // Resolve webhook URL: user settings take precedence over env var
      let webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL;

      const userSettingsDoc = await adminDb
        .collection('userSettings')
        .doc(user.uid)
        .get();

      if (userSettingsDoc.exists) {
        const userWebhookUrl = userSettingsDoc.data()?.feedbackWebhookUrl as string | undefined;
        if (userWebhookUrl?.trim()) {
          webhookUrl = userWebhookUrl.trim();
        }
      }

      if (!webhookUrl) {
        logger.error('No feedback webhook URL configured', new Error('Missing webhook URL'), { userId: user.uid });
        return NextResponse.json(
          { error: 'Feedback webhook is not configured. Add the Slack webhook URL in Settings → Notifications.' },
          { status: 503 }
        );
      }

      const slackResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!slackResponse.ok) {
        const statusText = slackResponse.statusText || `HTTP ${slackResponse.status}`;
        throw new Error(`Slack webhook responded with: ${statusText}`);
      }

      logger.info('Feedback submitted via Slack webhook', { type: body.type, userId: user.uid });
      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error('Error sending feedback', error as Error);
      return NextResponse.json(
        { error: 'Failed to submit feedback. Please try again.' },
        { status: 500 }
      );
    }
  });
}
