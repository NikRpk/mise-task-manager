# Quick Start Guide

## Local Development (No Docker!)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Start dev server
npm run dev

# Access at http://localhost:3000
```

## Deploy to Production

```bash
# Run tests first (optional but recommended)
npm run test:ci

# Deploy (includes tests automatically)
./deploy.sh
```

**Expected time:**
- First deployment: 10-14 minutes
- Subsequent deployments: 5-8 minutes ⚡

## What Happens During Deploy

1. ✅ Tests run on Google Cloud (3-4 min)
2. ✅ Docker image builds with caching (2-3 min)
3. ✅ Deploys to Cloud Run (1 min)
4. ✅ Updates Firebase Hosting (30s)

## Caching Magic

Libraries are **NOT** reinstalled every time!

**Dependencies reinstall only when:**
- You change `package.json` or `package-lock.json`
- First deployment ever
- Cache expires (rare)

**For code-only changes:**
- Dependencies cached ✅
- Tests run (fast with cached deps)
- Build uses cached node_modules
- **Result: 5-8 minute deployments**

## Common Commands

```bash
# Local development
npm run dev              # Start dev server
npm run test:watch       # Run tests in watch mode

# Testing
npm run test             # Run tests once
npm run test:ci          # Run tests like CI does
npm run test:coverage    # Generate coverage report

# Deployment
./deploy.sh              # Deploy to production
npm run firebase:rules   # Deploy only Firestore rules

# Debugging
gcloud builds list --project=dach-ai-mvps
gcloud builds log BUILD_ID --project=dach-ai-mvps
```

## Troubleshooting

**Build taking 15+ minutes?**
- First build is slower (no cache)
- Check if you changed `package.json` recently
- Subsequent builds will be faster

**Tests fail in Cloud Build but pass locally?**
- Check timezone issues (Cloud Build uses UTC)
- Verify all files are committed (not in `.gitignore`)
- Check Cloud Build logs: `gcloud builds log BUILD_ID`

**Need help?**
- See `DEPLOYMENT-OPTIMIZED.md` for detailed guide
- View build logs: `gcloud builds list`
- Check service status: `gcloud run services describe hf-tasks`

## Architecture

```
Firebase Hosting (hf-tasks.web.app)
    ↓ (routes all traffic)
Cloud Run (hf-tasks service)
    ↓ (reads/writes data)
Firestore (task-and-note-manager)
```

**Stack:**
- Next.js 16 (App Router, standalone mode)
- Firebase (Auth, Firestore)
- Google Cloud Run (serverless containers)
- TypeScript + Tailwind CSS

**No Docker Desktop needed!** All builds happen on Google Cloud.
