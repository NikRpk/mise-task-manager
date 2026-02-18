# Daily Task Reminders - Cloud Scheduler Setup

This guide explains how to set up Google Cloud Scheduler to trigger daily task reminder notifications.

## Overview

Daily task reminders are sent at **8:00 AM Europe/Berlin** time to all users who have enabled them in their notification settings. The reminders include:

- **Overdue tasks** (past deadline)
- **Tasks due today**
- **Tasks due tomorrow**

Notifications are sent via **Slack** and/or **Email** based on user preferences.

## Prerequisites

1. Google Cloud Project with billing enabled
2. Cloud Run service deployed (`hf-tasks`)
3. Gmail API configured with service account
4. Slack bot token configured (optional, for Slack notifications)

## Setup Steps

### 1. Enable Required APIs

```bash
gcloud services enable cloudscheduler.googleapis.com
```

### 2. Get Your Cloud Run Service URL

```bash
gcloud run services describe hf-tasks \
  --region=europe-west1 \
  --format="value(status.url)"
```

This will output something like: `https://hf-tasks-xxxxx.a.run.app`

### 3. Create Service Account for Cloud Scheduler

```bash
# Create service account
gcloud iam service-accounts create scheduler-invoker \
  --display-name="Cloud Scheduler Invoker"

# Grant permissions to invoke Cloud Run
gcloud run services add-iam-policy-binding hf-tasks \
  --region=europe-west1 \
  --member="serviceAccount:scheduler-invoker@dach-ai-mvps.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### 4. Create Cloud Scheduler Job

Replace `YOUR_CLOUD_RUN_URL` with the URL from step 2:

```bash
gcloud scheduler jobs create http daily-task-reminders \
  --location=europe-west1 \
  --schedule="0 8 * * *" \
  --time-zone="Europe/Berlin" \
  --uri="YOUR_CLOUD_RUN_URL/api/cron/daily-reminders" \
  --http-method=POST \
  --headers="X-CloudScheduler-JobName=daily-task-reminders" \
  --oidc-service-account-email=scheduler-invoker@dach-ai-mvps.iam.gserviceaccount.com \
  --oidc-audience="YOUR_CLOUD_RUN_URL"
```

**Example:**

```bash
gcloud scheduler jobs create http daily-task-reminders \
  --location=europe-west1 \
  --schedule="0 8 * * *" \
  --time-zone="Europe/Berlin" \
  --uri="https://hf-tasks-xxxxx.a.run.app/api/cron/daily-reminders" \
  --http-method=POST \
  --headers="X-CloudScheduler-JobName=daily-task-reminders" \
  --oidc-service-account-email=scheduler-invoker@dach-ai-mvps.iam.gserviceaccount.com \
  --oidc-audience="https://hf-tasks-xxxxx.a.run.app"
```

## Testing

### Test the Scheduler Job Manually

```bash
gcloud scheduler jobs run daily-task-reminders \
  --location=europe-west1
```

### View Job Status

```bash
gcloud scheduler jobs describe daily-task-reminders \
  --location=europe-west1
```

### View Job Logs

```bash
gcloud logging read "resource.type=cloud_scheduler_job AND resource.labels.job_id=daily-task-reminders" \
  --limit=50 \
  --format=json
```

### View Cloud Run Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=hf-tasks" \
  --limit=50 \
  --format="table(timestamp,textPayload)"
```

## Management Commands

### Pause the Job

```bash
gcloud scheduler jobs pause daily-task-reminders \
  --location=europe-west1
```

### Resume the Job

```bash
gcloud scheduler jobs resume daily-task-reminders \
  --location=europe-west1
```

### Update Schedule

```bash
gcloud scheduler jobs update http daily-task-reminders \
  --location=europe-west1 \
  --schedule="0 9 * * *"
```

### Delete the Job

```bash
gcloud scheduler jobs delete daily-task-reminders \
  --location=europe-west1
```

## Environment Variables

Ensure these environment variables are set in your Cloud Run deployment:

- `GMAIL_SENDER_EMAIL` - Email address for sending reminders
- `GMAIL_SERVICE_ACCOUNT_KEY` - Base64 encoded service account JSON
- `SLACK_BOT_TOKEN` - Slack bot token for sending DMs
- `NEXT_PUBLIC_APP_URL` - URL to the task manager app (for links in reminders)

These are automatically configured when deploying via `./deploy-fast.sh`.

## Security

The cron endpoint (`/api/cron/daily-reminders`) validates the request by checking:

1. The `X-CloudScheduler-JobName` header must equal `daily-task-reminders`
2. Authentication via OIDC service account

This prevents unauthorized access to the endpoint.

## Cost

- Cloud Scheduler: Free tier covers 3 jobs
- Cloud Run: Minimal execution time (~5-30 seconds daily)
- Gmail API: Free within reasonable limits
- Slack API: Free

Estimated cost: **$0/month** within free tiers.

## Troubleshooting

### Job Not Running

Check if the job exists and is not paused:

```bash
gcloud scheduler jobs describe daily-task-reminders \
  --location=europe-west1
```

### No Notifications Received

1. Check Cloud Run logs for errors
2. Verify users have enabled daily reminders in settings
3. Test Slack/Gmail connections manually
4. Ensure tasks exist with relevant deadlines

### 403 Forbidden Errors

The service account may not have permission to invoke Cloud Run. Re-run step 3 to grant permissions.

## Monitoring

Set up Cloud Monitoring alerts for:

- Scheduler job failures
- Cloud Run invocation errors
- High error rates in the cron endpoint

Example alert:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Daily Reminder Failures" \
  --condition-display-name="Scheduler Job Failed" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=60s \
  --aggregation-group-by-fields="resource.job_id" \
  --aggregation-per-series-aligner=ALIGN_RATE \
  --condition-filter='resource.type="cloud_scheduler_job" AND metric.type="cloudscheduler.googleapis.com/job/attempt_count" AND metric.label.response_class="error"'
```

## Next Steps

1. Deploy your Cloud Run service with Gmail credentials
2. Run the setup commands above
3. Test the job manually with `gcloud scheduler jobs run`
4. Enable daily reminders in user settings
5. Monitor logs to verify successful delivery
