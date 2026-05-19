---
name: feature-preview
description: After implementing a new feature or UI change, start the local dev server and present the preview URL for the user to review. Then ask whether to deploy to production. Use when building a feature, making a UI change, or completing any visible code change in this project.
---

# Feature Preview Workflow

After completing any feature or visible change, follow this workflow before finishing.

## Steps

### 1. Start the local dev server

Check if a dev server is already running in an existing terminal. If not, start one in the background:

```bash
npm run dev
```

Wait for the server to be ready (look for `ready` or `localhost` in output), then report:

> "The dev server is running at **http://localhost:3000** — please review the change."

### 2. Ask the user about production deployment

After presenting the link, use the `AskQuestion` tool to ask:

> **"Would you like to deploy this to production?"**
> - Yes — deploy now
> - No — leave it running locally

### 3. Deploy if confirmed

If the user confirms, run the deploy script:

```bash
bash deploy-firebase.sh
```

This runs tests → builds → deploys to Firebase and sends a Slack notification.

## Notes

- Only start one dev server. If port 3000 is already in use, report the existing URL instead of starting a new process.
- Do not deploy without explicit user confirmation.
- The deploy script handles tests automatically — do not run them separately.
