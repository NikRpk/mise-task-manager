# Deployment Guide

## Overview

This project can be deployed in two ways:
1. **Cloud Build** (recommended) - No local Docker needed
2. **Local Build** - Faster, requires Docker/Colima

## Important: HelloFresh Artifactory Compliance

✅ **For local builds: Use `Dockerfile.artifactory`**

When building locally with Colima, use the Artifactory-compliant Dockerfile:
```bash
docker build -f Dockerfile.artifactory -t my-app .
```

✅ **For Cloud Build: Use standard `Dockerfile`**

Google Cloud Build can't access HelloFresh's internal Artifactory, so it uses Docker Hub.
This is acceptable for Cloud Build since it runs in Google's infrastructure.

**File breakdown:**
- `Dockerfile` - Uses `node:20-alpine` from Docker Hub (for Cloud Build)
- `Dockerfile.artifactory` - Uses `repo.tools-k8s.hellofresh.io/node:20-alpine` (for local builds)

The `npm run deploy` script automatically uses `Dockerfile.artifactory` for compliance.

---

## Method 1: Cloud Build (Recommended)

**No local Docker installation required!**

Google Cloud Build compiles the container remotely.

### Deploy Command:
```bash
gcloud run deploy hf-tasks --source . --region europe-west1 --allow-unauthenticated
```

### Prerequisites:
- ✅ Node.js installed
- ✅ `gcloud` CLI installed
- ✅ `.env.production.local` file exists (contains secrets)
- ❌ Docker NOT required

### How it works:
1. Uploads source code to Google Cloud Build
2. Google builds the Docker image using the Dockerfile
3. Deploys to Cloud Run
4. Environment variables from `.env.production.local` are automatically included

---

## Method 2: Local Build with Colima (Faster)

Build Docker images locally for faster iteration.

### Setup Colima (First time only):

```bash
# Install Colima and Docker CLI
brew install colima docker docker-compose

# Start Colima
colima start --cpu 4 --memory 8

# Verify it's running
docker ps
```

### Deploy:
```bash
npm run deploy
```

Or manually:
```bash
./deploy-fast.sh
```

### Prerequisites:
- ✅ Node.js installed
- ✅ `gcloud` CLI installed
- ✅ Colima running
- ✅ `.env.production.local` file exists

### Stop Colima when done:
```bash
colima stop
```

---

## Environment Variables

### `.env.production` (Committed to Git)
Contains public Firebase config - safe to commit.

### `.env.production.local` (NOT in Git)
Contains secrets:
```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="https://hf-tasks.web.app/api/auth/google/callback"
SLACK_BOT_TOKEN="..."
```

⚠️ **This file is automatically loaded during builds and must exist for deployment.**

---

## Comparison

| Feature | Cloud Build | Local (Colima) |
|---------|-------------|----------------|
| Speed | ~7 min | ~3 min |
| Docker needed locally | ❌ No | ✅ Yes |
| Setup complexity | Low | Medium |
| Best for | Occasional deploys | Frequent iteration |
| HelloFresh compliant | ✅ Yes | ✅ Yes |

---

## Troubleshooting

### "Docker is not running"
```bash
# Start Colima
colima start
```

### "Missing .env.production.local"
```bash
# Copy from .env.local or create new
cp .env.local .env.production.local
# Edit to use production values
```

### "Permission denied while pushing to GCR"
```bash
# Re-authenticate
gcloud auth configure-docker
```

---

## Development Workflow

```bash
# Local development (no Docker needed)
npm run dev

# Test
npm test

# Deploy to production
gcloud run deploy --source .

# Or use local build for speed
npm run deploy
```
