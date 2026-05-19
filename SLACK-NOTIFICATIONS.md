# Firebase Deployment with Slack Notifications

This project is set up to send Slack notifications whenever someone deploys to Firebase.

## Setup Instructions

### 1. Create Slack Webhook

1. Go to your Slack workspace settings
2. Navigate to **Apps** → **Incoming Webhooks**
3. Click **Add to Slack**
4. Choose the channel where you want notifications (e.g., `#deployments`)
5. Copy the webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### 2. Set Firebase Environment Variables

Set the Slack webhook URL as an environment variable for your Firebase Functions:

```bash
firebase functions:config:set slack.webhook_url="YOUR_SLACK_WEBHOOK_URL"
```

To verify it's set:

```bash
firebase functions:config:get
```

### 3. Deploy Firebase Functions

First time setup - deploy the notification functions:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

This will deploy two functions:
- `onHostingDeploy` - HTTP function triggered by deployment script
- `onCloudBuildComplete` - Pub/Sub function for Cloud Build events

### 4. Deploy Your App

Now anyone can deploy using:

```bash
./deploy-firebase.sh
```

Or set custom deployer info:

```bash
DEPLOYER="Jane Doe" APP_NAME="my-app" ./deploy-firebase.sh
```

Or use the npm script:

```bash
npm run firebase:deploy
```

### 5. Grant Function Permissions

Make the HTTP function publicly accessible (so the deploy script can trigger it):

```bash
gcloud functions add-iam-policy-binding onHostingDeploy \
  --region=europe-west1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=dach-ai-mvps
```

## How It Works

1. **Firebase Hosting Deployments**: When you run `firebase deploy --only hosting`, the deployment script automatically calls the `onHostingDeploy` function which sends a Slack notification.

2. **Cloud Build Deployments**: The `onCloudBuildComplete` function listens to Cloud Build Pub/Sub events and sends notifications for successful builds.

## Notification Format

The Slack notification includes:
- 🚀 Deployment header (✅ for success, ❌ for failure)
- **App name** (e.g., "hf-tasks") - clearly shows which app was deployed
- **Deployer name** (automatically detected from system user)
- **Deployer email** (from git config or system) - clickable mailto link
- **Environment** (production, staging, etc.)
- **Status** (✅ Success or ❌ Failed)
- **Version/Tag** (timestamp-based)
- **Service URL** (clickable link - only for successful deployments)
- **Error message** (for failed deployments only)
- **Timestamp** (in Europe/Berlin timezone)

### Email Detection

The deployment script automatically detects the deployer's email from:
1. **Git config** (`git config user.email`) - most reliable
2. **System fallback** (`username@hostname`) - if git config not available

To ensure accurate email tracking, make sure your git config is set:

```bash
git config --global user.email "your.email@company.com"
git config --global user.name "Your Name"
```

## Testing

Test the notification manually:

```bash
curl -X POST "https://europe-west1-dach-ai-mvps.cloudfunctions.net/onHostingDeploy" \
  -H "Content-Type: application/json" \
  -d '{
    "deployer": "Test User",
    "appName": "hf-tasks",
    "version": "test-v1",
    "environment": "test"
  }'
```

## Troubleshooting

### Notification not appearing

1. Check if the function is deployed:
   ```bash
   firebase functions:list
   ```

2. Check function logs:
   ```bash
   firebase functions:log --only onHostingDeploy
   ```

3. Verify the webhook URL is set:
   ```bash
   firebase functions:config:get slack.webhook_url
   ```

4. Test the Slack webhook directly:
   ```bash
   curl -X POST YOUR_WEBHOOK_URL \
     -H 'Content-Type: application/json' \
     -d '{"text": "Test notification"}'
   ```

### Permission denied

If you get permission errors, ensure the function has the correct IAM policy:

```bash
gcloud functions add-iam-policy-binding onHostingDeploy \
  --region=europe-west1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=dach-ai-mvps
```

## Multiple Apps/Environments

You can deploy different apps or environments by setting environment variables:

```bash
# Staging deployment
APP_NAME="hf-tasks-staging" \
ENVIRONMENT="staging" \
SERVICE_URL="https://hf-tasks-staging.web.app" \
./deploy-firebase.sh

# Production deployment
APP_NAME="hf-tasks" \
ENVIRONMENT="production" \
SERVICE_URL="https://hf-tasks.web.app" \
./deploy-firebase.sh

# Different team member deploying
DEPLOYER="Jane Smith" \
APP_NAME="hf-analytics" \
SERVICE_URL="https://hf-analytics.web.app" \
./deploy-firebase.sh
```

Each deployment will show up in Slack with the appropriate metadata, making it crystal clear:
- **Which app** was deployed
- **Who** deployed it (with their email)
- **Whether** it succeeded or failed
- **What environment** it was deployed to

### Example: Multiple Apps in Same Project

If you have multiple apps (e.g., `hf-tasks`, `hf-analytics`, `hf-admin`) all deploying to the same Firebase project, each deployment notification will clearly show the app name, preventing any confusion about which service was updated.
