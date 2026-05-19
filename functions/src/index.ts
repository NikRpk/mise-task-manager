import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import * as admin from 'firebase-admin';

admin.initializeApp();

interface SlackWorkflowPayload {
  service_url: string;
  deployment_time: string;
  version: string;
  status: string;
  app: string;
  environment: string;
  deployer: string;
}

/**
 * Looks up the email of whoever triggered a Cloud Build by querying the Cloud Logging REST API.
 * The Pub/Sub payload doesn't include the triggering user — it's only in Cloud Audit Logs.
 * We use the REST API (not the Node.js client) because it returns decoded JSON,
 * whereas the gRPC client returns protoPayload as raw bytes.
 */
async function getBuildTriggeredBy(buildId: string, projectId: string): Promise<string> {
  try {
    const tokenResponse = await admin.app().options.credential!.getAccessToken();
    const token = tokenResponse.access_token;

    const filter = [
      `resource.type="build"`,
      `resource.labels.build_id="${buildId}"`,
      `protoPayload.methodName="google.devtools.cloudbuild.v1.CloudBuild.CreateBuild"`,
    ].join('\n');

    const response = await fetch('https://logging.googleapis.com/v2/entries:list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        resourceNames: [`projects/${projectId}`],
        filter,
        pageSize: 1,
        orderBy: 'timestamp desc',
      }),
    });

    if (!response.ok) {
      throw new Error(`Logging API error: ${response.status}`);
    }

    interface LoggingEntry {
      protoPayload?: {
        authenticationInfo?: {
          principalEmail?: string;
        };
      };
    }
    const data = await response.json() as { entries?: LoggingEntry[] };
    const email = data.entries?.[0]?.protoPayload?.authenticationInfo?.principalEmail;
    if (email) return email;
  } catch (err) {
    console.warn('Could not retrieve build triggerer from audit logs:', err);
  }
  return 'ci-bot@dach-ai-mvps.iam.gserviceaccount.com';
}

/**
 * Pub/Sub triggered function for Cloud Build events.
 * Fires automatically for every gcloud builds submit in the GCP project —
 * from any person, any machine, any codebase. No local config needed by deployers.
 *
 * Environment variable required:
 * - SLACK_WEBHOOK_URL: Slack Workflow webhook URL (set in functions/.env)
 */
export const onCloudBuildComplete = onMessagePublished(
  { topic: 'cloud-builds', region: 'europe-west1' },
  async (event) => {
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!slackWebhookUrl) {
      console.warn('SLACK_WEBHOOK_URL not configured');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildData: Record<string, any> = event.data.message.json;
    const buildStatus: string = buildData.status;

    // Only notify on terminal states — ignore intermediate ones (QUEUED, WORKING, etc.)
    const terminalStatuses = ['SUCCESS', 'FAILURE', 'TIMEOUT', 'INTERNAL_ERROR'];
    if (!terminalStatuses.includes(buildStatus)) {
      return;
    }

    // Ignore non-user builds:
    //  - bt-LIFECYCLE: Google-managed runtime auto-rebuilds (Node.js upgrades etc.)
    //  - service_*: Cloud Functions deployments (any function in any codebase)
    //    -> genuine hosting deploys via gcloud builds submit have no tags at all.
    const tags: string[] = buildData.tags ?? [];
    const isLifecycleBuild = tags.includes('bt-LIFECYCLE');
    const isFunctionBuild = tags.some(tag => tag.startsWith('service_'));
    if (isLifecycleBuild || isFunctionBuild) {
      return;
    }

    const version: string = buildData.substitutions?._TAG ?? buildData.id ?? 'unknown';
    const projectId: string = buildData.projectId ?? 'dach-ai-mvps';
    const finishTime = buildData.finishTime ? new Date(buildData.finishTime as string) : new Date();

    const [deploymentTime, deployer] = await Promise.all([
      Promise.resolve(finishTime.toLocaleString('de-DE', {
        timeZone: 'Europe/Berlin',
        dateStyle: 'medium',
        timeStyle: 'short',
      })),
      getBuildTriggeredBy(buildData.id as string, projectId),
    ]);

    const status = buildStatus === 'SUCCESS' ? '✅ Success' : `❌ Failed (${buildStatus})`;

    const payload: SlackWorkflowPayload = {
      service_url: 'https://hf-tasks.web.app',
      deployment_time: deploymentTime,
      version: version,
      status: status,
      app: 'hf-tasks',
      environment: 'production',
      deployer: deployer,
    };

    try {
      const response = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Slack API error: ${response.status} - ${responseText}`);
      }

      console.log('Cloud Build Slack notification sent', { status: buildStatus, version });
    } catch (error) {
      console.error('Failed to send Cloud Build Slack notification:', error);
    }
  }
);
