# 🚀 Slack Deployment Notifications - Ready to Use!

Your Slack notification system is configured and ready to go. Here's everything you need to know.

## ⚡ Quick Start (3 Steps)

### 1️⃣ Deploy the Cloud Function

```bash
npm run firebase:deploy:functions
```

### 2️⃣ Test It

```bash
npm run test:slack
```

You should see 3 test messages in your Slack channel.

### 3️⃣ Deploy Your App

```bash
./deploy-firebase.sh
```

That's it! Every deployment now sends a Slack notification automatically.

## 📱 What Gets Sent to Slack

Every deployment notification includes:

```json
{
  "app": "hf-tasks",
  "deployer": "John Doe (john.doe@company.com)",
  "environment": "production",
  "version": "20260225-142315",
  "service_url": "https://hf-tasks.web.app",
  "deployment_time": "25.02.2026 at 14:23",
  "status": "✅ Success"
}
```

### For Failed Deployments:

```json
{
  ...
  "status": "❌ Failed",
  "error_message": "Build failed: Module not found"
}
```

## 🎯 Your Webhook Configuration

**Webhook URL:**
```
https://hooks.slack.com/triggers/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
```

This is a **Slack Workflow webhook**, which means:
- ✅ You can customize the message format in Slack's Workflow Builder
- ✅ Simplified JSON payload (cleaner than traditional webhooks)
- ✅ More flexible for future changes

## 🔧 For Your Team

Share these commands with your team:

### Basic Deployment
```bash
./deploy-firebase.sh
```

### Deploy Different Apps
```bash
# Deploy hf-analytics
APP_NAME="hf-analytics" \
SERVICE_URL="https://hf-analytics.web.app" \
./deploy-firebase.sh

# Deploy to staging
APP_NAME="hf-tasks-staging" \
ENVIRONMENT="staging" \
SERVICE_URL="https://hf-tasks-staging.web.app" \
./deploy-firebase.sh
```

### Email Detection

The system automatically gets the deployer's email from:
1. `git config user.email` (recommended)
2. Falls back to `username@hostname`

**Make sure team members have git configured:**
```bash
git config --global user.email "their.email@company.com"
git config --global user.name "Their Name"
```

## 📊 Notifications Show:

- ✅ **App name** - Which service was deployed (`hf-tasks`, `hf-analytics`, etc.)
- ✅ **Deployer** - Name and email (auto-detected)
- ✅ **Status** - Success or failure
- ✅ **Environment** - production, staging, etc.
- ✅ **Version** - Timestamp-based version number
- ✅ **Service URL** - Direct link to the deployed app
- ✅ **Timestamp** - When the deployment happened (Europe/Berlin timezone)
- ✅ **Error details** - For failed deployments

## 🧪 Testing Commands

```bash
# Test Slack notifications (sends 3 test messages)
npm run test:slack

# Test with custom webhook
SLACK_WEBHOOK_URL="your-webhook-url" ./test-slack-notification.sh

# Deploy the Cloud Function
npm run firebase:deploy:functions
```

## 📁 Project Structure

```
/
├── functions/
│   └── src/
│       └── index.ts          # Cloud Function that sends notifications
├── deploy-firebase.sh         # Main deployment script
├── test-slack-notification.sh # Test script
├── setup-slack-notifications.sh # Setup script
├── SLACK-PAYLOAD-FORMAT.md   # Detailed payload documentation
├── SLACK-NOTIFICATION-EXAMPLES.md # Visual examples
└── QUICKSTART-SLACK.md       # This file
```

## 🔄 How It Works

```
1. Developer runs: ./deploy-firebase.sh
   ↓
2. Script runs tests → builds → deploys to Firebase
   ↓
3. Script calls Cloud Function with deployment data
   ↓
4. Cloud Function formats data into Slack payload
   ↓
5. Cloud Function sends to Slack Workflow webhook
   ↓
6. Team sees notification in Slack channel
```

## 🎨 Customize the Slack Message

Since you're using a Slack Workflow webhook, you can customize how the notification appears:

1. Go to your Slack workspace
2. Open **Workflow Builder**
3. Find your deployment notification workflow
4. Edit the message template using the variables:
   - `app`
   - `deployer`
   - `environment`
   - `version`
   - `service_url`
   - `deployment_time`
   - `status`
   - `error_message`

## 🐛 Troubleshooting

### Notifications not appearing?

**Check the Cloud Function:**
```bash
firebase functions:log --only onHostingDeploy
```

**Verify webhook URL is set:**
```bash
firebase functions:config:get slack.webhook_url
```

**Test the webhook directly:**
```bash
npm run test:slack
```

### Function not deployed?

```bash
npm run firebase:deploy:functions
```

### Need to update webhook URL?

```bash
firebase functions:config:set slack.webhook_url="NEW_WEBHOOK_URL"
firebase deploy --only functions
```

## 📚 Full Documentation

- **Quick Start**: This file
- **Payload Format**: `SLACK-PAYLOAD-FORMAT.md`
- **Examples**: `SLACK-NOTIFICATION-EXAMPLES.md`
- **Full Guide**: `SLACK-NOTIFICATIONS.md`

## ✨ Key Benefits

✅ **Zero-config for team** - Just run the deploy script
✅ **Multi-app support** - Clearly shows which app deployed
✅ **Email tracking** - Auto-detects deployer's email
✅ **Success/failure** - Immediate feedback with error details
✅ **Deployment history** - Slack becomes your audit log
✅ **Customizable** - Edit the Slack Workflow to change the format

## 🎉 You're All Set!

Just run this to get started:

```bash
# Deploy the function (first time only)
npm run firebase:deploy:functions

# Test it
npm run test:slack

# Deploy your app
./deploy-firebase.sh
```

Every team member who deploys will automatically trigger notifications with their name, email, and app details!
