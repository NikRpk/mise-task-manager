# Quick Start: Slack Notifications for Deployments

Get notified in Slack whenever anyone deploys to Firebase - takes 5 minutes to set up!

## 🚀 One-Command Setup

```bash
./setup-slack-notifications.sh
```

This script will:
1. ✅ Ask for your Slack webhook URL
2. ✅ Configure Firebase Functions
3. ✅ Deploy the notification functions
4. ✅ Set up permissions

## 📝 Manual Setup (Alternative)

### Step 1: Get Slack Webhook URL

You have two options:

**Option A: Slack Workflow (Recommended - More Flexible)**

Your webhook URL format:
```
https://hooks.slack.com/triggers/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
```

This type of webhook allows you to customize the Slack message format in the Slack UI.

**Option B: Incoming Webhooks (Traditional)**

1. Go to https://api.slack.com/messaging/webhooks
2. Click "Create New App" → "From scratch"
3. Name it "Deployment Notifications" and select your workspace
4. Click "Incoming Webhooks" → Enable it
5. Click "Add New Webhook to Workspace"
6. Choose your channel (e.g., `#deployments`)
7. Copy the webhook URL

### Step 2: Configure & Deploy

The webhook URL is already configured in the setup script. Just run:

```bash
# Automated setup (uses your webhook by default)
./setup-slack-notifications.sh

# Or manual setup
firebase functions:config:set slack.webhook_url="YOUR_WEBHOOK_URL"
npm run firebase:deploy:functions

# Make function publicly accessible
gcloud functions add-iam-policy-binding onHostingDeploy \
  --region=europe-west1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=dach-ai-mvps
```

### Step 3: Test It!

```bash
# Run the test script to verify everything works
./test-slack-notification.sh
```

This will send 3 test notifications to your Slack channel:
1. ✅ Success notification (direct webhook)
2. ✅ Success notification (via Cloud Function)
3. ❌ Failure notification (to test error handling)

## 🎉 Start Deploying

Anyone can now deploy and automatically trigger Slack notifications:

```bash
# Basic deployment
./deploy-firebase.sh

# With custom info
DEPLOYER="Your Name" ./deploy-firebase.sh
```

## 📱 What You'll See in Slack

**Successful Deployment:**
```
✅ Firebase Deployment Successful
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
App:          hf-tasks
Deployer:     John Doe
              john.doe@company.com
Environment:  production
Status:       ✅ Success
Version:      20260225-142315

Service URL:  https://hf-tasks.web.app

Deployment completed at: 25.02.2026 at 14:23
```

**Failed Deployment:**
```
❌ Firebase Deployment Failed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
App:          hf-tasks
Deployer:     Jane Smith
              jane.smith@company.com
Environment:  production
Status:       ❌ Failed
Version:      20260225-142315

Error:
```
Build failed: Module not found
```

Deployment failed at: 25.02.2026 at 14:23
```

## 🔧 Troubleshooting

**Problem:** Notification not showing up

**Solutions:**
1. Check function logs: `firebase functions:log --only onHostingDeploy`
2. Verify webhook: `firebase functions:config:get slack.webhook_url`
3. Test webhook directly: `curl -X POST YOUR_WEBHOOK_URL -H 'Content-Type: application/json' -d '{"text":"test"}'`

**Problem:** Permission denied

**Solution:** Run the IAM binding command again (see Step 2 above)

## 📖 Full Documentation

See `SLACK-NOTIFICATIONS.md` for advanced configuration, multiple environments, and Cloud Build integration.

## 🎯 Benefits

- ✅ **Track who deployed what** - See name AND email address of deployer
- ✅ **Success/Failure tracking** - Instantly know if deployment worked
- ✅ **Multiple apps** - Clearly shows which app was deployed
- ✅ **Team visibility** - Everyone sees deployments in real-time
- ✅ **Deployment history** - Slack becomes your deployment log
- ✅ **Zero-config for team** - Works automatically for everyone who deploys
- ✅ **Error reporting** - Failed deployments show error messages
