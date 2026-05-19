#!/bin/bash
set -e

echo "🔧 Setting up Slack notifications for Firebase deployments"
echo ""

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install it with:"
    echo "   npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
echo "📝 Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1 || {
    echo "⚠️ Not logged in to Firebase. Running firebase login..."
    firebase login
}

# Use the provided webhook URL or ask for it
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-https://hooks.slack.com/triggers/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}"

echo ""
echo "Using Slack webhook URL: $SLACK_WEBHOOK_URL"
echo ""
read -p "Is this correct? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please enter your Slack webhook URL:"
    read -r SLACK_WEBHOOK_URL
fi

if [ -z "$SLACK_WEBHOOK_URL" ]; then
    echo "❌ Webhook URL cannot be empty"
    exit 1
fi

echo ""
echo "🔑 Setting Firebase Functions environment variable..."
firebase functions:config:set slack.webhook_url="$SLACK_WEBHOOK_URL"

echo ""
echo "📦 Installing function dependencies..."
cd functions
npm install
cd ..

echo ""
echo "🚀 Deploying Firebase Functions..."
firebase deploy --only functions

echo ""
echo "🔓 Making function publicly accessible..."
gcloud functions add-iam-policy-binding onHostingDeploy \
  --region=europe-west1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=dach-ai-mvps || echo "⚠️ Could not set IAM policy (you may need to do this manually)"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the notification:"
echo "      ./deploy-firebase.sh"
echo ""
echo "   2. Share with your team:"
echo "      Anyone can now deploy with: ./deploy-firebase.sh"
echo "      And they'll all trigger Slack notifications!"
echo ""
echo "📖 Full documentation: SLACK-NOTIFICATIONS.md"
