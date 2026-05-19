# Slack Webhook Payload Format

Your Slack workflow webhook expects this simplified JSON structure:

## Payload Structure

```json
{
  "app": "string",
  "deployer": "string", 
  "environment": "string",
  "version": "string",
  "service_url": "string",
  "deployment_time": "string",
  "status": "string (optional)",
  "error_message": "string (optional)"
}
```

## Field Descriptions

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| `app` | string | Yes | Name of the application being deployed | `"hf-tasks"`, `"hf-analytics"` |
| `deployer` | string | Yes | Person who triggered the deployment (with email) | `"John Doe (john.doe@company.com)"` |
| `environment` | string | Yes | Deployment environment | `"production"`, `"staging"`, `"development"` |
| `version` | string | Yes | Version or build identifier | `"20260225-142315"`, `"v1.2.3"` |
| `service_url` | string | Yes | URL where the app is deployed | `"https://hf-tasks.web.app"` |
| `deployment_time` | string | Yes | Human-readable timestamp | `"25.02.2026 at 14:23"` |
| `status` | string | Optional | Deployment status indicator | `"✅ Success"`, `"❌ Failed"` |
| `error_message` | string | Optional | Error details (only for failures) | `"Build failed: Module not found"` |

## Example Payloads

### Successful Deployment

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

### Failed Deployment

```json
{
  "app": "hf-analytics",
  "deployer": "Jane Smith (jane.smith@company.com)",
  "environment": "staging",
  "version": "20260225-145523",
  "service_url": "https://hf-analytics-staging.web.app",
  "deployment_time": "25.02.2026 at 14:55",
  "status": "❌ Failed",
  "error_message": "Tests failed: 3 test suites failed out of 15"
}
```

### Multiple Apps Example

```json
// App 1: hf-tasks
{
  "app": "hf-tasks",
  "deployer": "John Doe (john.doe@company.com)",
  "environment": "production",
  "version": "20260225-140000",
  "service_url": "https://hf-tasks.web.app",
  "deployment_time": "25.02.2026 at 14:00",
  "status": "✅ Success"
}

// App 2: hf-analytics (30 minutes later)
{
  "app": "hf-analytics",
  "deployer": "Jane Smith (jane.smith@company.com)",
  "environment": "production",
  "version": "20260225-143000",
  "service_url": "https://hf-analytics.web.app",
  "deployment_time": "25.02.2026 at 14:30",
  "status": "✅ Success"
}
```

## How the Cloud Function Constructs This

The Cloud Function (`functions/src/index.ts`) receives data from the deployment script and transforms it into this format:

```typescript
const payload = {
  app: appName,                              // From APP_NAME env var or default
  deployer: `${deployerName} (${email})`,    // From git config + env var
  environment: environment,                   // From ENVIRONMENT env var
  version: version,                          // Timestamp from deployment
  service_url: serviceUrl,                   // From SERVICE_URL env var
  deployment_time: new Date().toLocaleString('de-DE', {
    timeZone: 'Europe/Berlin',
    dateStyle: 'medium',
    timeStyle: 'short'
  }),
  status: success ? '✅ Success' : '❌ Failed',
  error_message: errorMessage               // Only included if deployment failed
};
```

## Testing the Webhook

### Direct Test (Bypass Cloud Function)

```bash
curl -X POST "https://hooks.slack.com/triggers/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" \
  -H "Content-Type: application/json" \
  -d '{
    "app": "test-app",
    "deployer": "Test User (test@example.com)",
    "environment": "test",
    "version": "test-1.0.0",
    "service_url": "https://example.com",
    "deployment_time": "25.02.2026 at 15:00",
    "status": "✅ Success"
  }'
```

### Via Cloud Function

```bash
curl -X POST "https://europe-west1-dach-ai-mvps.cloudfunctions.net/onHostingDeploy" \
  -H "Content-Type: application/json" \
  -d '{
    "deployer": "Test User",
    "deployerEmail": "test@example.com",
    "appName": "test-app",
    "version": "test-1.0.0",
    "environment": "test",
    "serviceUrl": "https://example.com",
    "success": true
  }'
```

The Cloud Function handles the transformation from the deployment data to the Slack webhook format.

### Automated Test Script

```bash
./test-slack-notification.sh
```

This script tests:
1. Direct webhook connection
2. Cloud Function integration
3. Failure notification handling

## Customizing the Slack Message

Since you're using a Slack Workflow webhook, you can customize how the message appears in Slack:

1. Go to your Slack workspace
2. Navigate to **Workflow Builder**
3. Find your deployment notification workflow
4. Edit how the variables are displayed in the message

The workflow receives all the fields from the JSON payload and you can format them however you like in the Slack UI.

## Benefits of This Format

✅ **Simple** - Clean JSON structure, easy to understand
✅ **Flexible** - Slack Workflow lets you customize the UI
✅ **Complete** - All essential deployment info included
✅ **Extensible** - Easy to add new fields if needed
✅ **Type-safe** - TypeScript interfaces ensure correctness
