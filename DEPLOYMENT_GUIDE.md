# 🚀 Deployment Guide

## Fast Deployment (Recommended!)

### Local Docker Build + Push (~2-3 minutes)
```bash
./deploy-fast.sh
```

**Why it's faster:**
- Builds Docker image on your local machine (uses your CPU, not Cloud Build)
- Pushes pre-built image to Cloud Run
- Skips the slow remote build process
- **5-10x faster** than remote builds

**Requirements:**
- Docker Desktop running
- gcloud CLI authenticated
- Environment variables in `.env.local`

### Deploy to Custom Domain
```bash
./deploy-to-custom-domain.sh
```

This deploys to Cloud Run AND configures Firebase Hosting at https://hf-tasks.web.app/

## Development

### Local Development
```bash
npm run dev
# or
./dev-local.sh
```

Opens at http://localhost:3000

### Environment Variables

Create `.env.local` with:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
SLACK_BOT_TOKEN=your_slack_token
```

## Troubleshooting

### Docker Issues
If deployment fails with I/O errors:
1. Restart Docker Desktop
2. Or reset: `docker system prune -a`
3. Retry deployment

### Authentication Issues
```bash
gcloud auth login
gcloud config set project dach-ai-mvps
```

### Method 3: Deploy to Custom Domain (~6-10 minutes)
```bash
./deploy-to-custom-domain.sh
```

---

## 🏠 Local Development & Testing

### ✅ **YES! You can test locally** - API routes work perfectly!

Your app uses Firebase, which provides emulators for local testing. All API routes will work because they use Firebase Admin SDK, which can connect to either:
- **Production**: Real Firebase (when deployed)
- **Local**: Firebase Emulators (when running locally)

### Quick Start: Regular Development (Uses Production Firebase)
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**What works:**
- ✅ All UI components
- ✅ All API routes (connects to production Firebase)
- ✅ Authentication
- ✅ Database operations
- ✅ Google Calendar integration
- ✅ Slack integration

**Note:** This connects to your **production** Firebase database, so changes are real!

---

### Advanced: Local Development with Emulators (Isolated Testing)

If you want to test without touching production data:

#### 1. Install Firebase Tools (one-time)
```bash
npm install -g firebase-tools
```

#### 2. Start Local Environment
```bash
./dev-local.sh
```

This will:
- Start Firebase Firestore emulator (port 8080)
- Start Firebase Auth emulator (port 9099)
- Start Next.js dev server (port 3000)
- All data is isolated - won't affect production!

**What works with emulators:**
- ✅ All UI components
- ✅ Authentication (fake accounts)
- ✅ Firestore database operations
- ⚠️ Google Calendar (uses real API - no emulator)
- ⚠️ Slack (uses real API - no emulator)

---

## Speed Comparison

| Method | Time | Best For |
|--------|------|----------|
| `./deploy-fast.sh` | ~2-3 min | **Quick deployments** |
| `./deploy.sh` | ~5-8 min | Standard deployments |
| `./deploy-to-custom-domain.sh` | ~6-10 min | Full deployment + Firebase Hosting |
| `npm run dev` | Instant | **Local testing** (production DB) |
| `./dev-local.sh` | Instant | Local testing (isolated) |

---

## 💡 Recommended Workflow

### For Daily Development:
```bash
# 1. Test locally (instant feedback)
npm run dev

# 2. When ready, fast deploy
./deploy-fast.sh
```

### For Feature Development:
```bash
# 1. Test with emulators (isolated)
./dev-local.sh

# 2. Test with production data
npm run dev

# 3. Deploy when ready
./deploy-fast.sh
```

---

## 🔧 Requirements

### For Fast Deployment:
- Docker Desktop installed and running
- `gcloud` CLI authenticated

### For Local Emulators:
- `firebase-tools` installed globally
- `firebase.json` configured (already done)

---

## 🐛 Troubleshooting

### "Docker not found"
```bash
# Install Docker Desktop
# https://www.docker.com/products/docker-desktop/
```

### "firebase not found"
```bash
npm install -g firebase-tools
```

### API routes return 401/403 locally
- Check your `.env.local` file has all required variables
- Make sure you're signed in with a valid Google account

### Emulators not starting
```bash
# Kill existing emulator processes
pkill -f firebase
firebase emulators:start --only firestore,auth
```

---

## 📊 What Gets Deployed Where

| Component | Local Dev | Cloud Run | Firebase Hosting |
|-----------|-----------|-----------|------------------|
| Next.js App | ✅ | ✅ | ✅ (proxy) |
| API Routes | ✅ | ✅ | ✅ (via proxy) |
| Firebase Auth | ✅ | ✅ | ✅ |
| Firestore | ✅ | ✅ | ✅ |
| Static Assets | ✅ | ✅ | ✅ |

---

## 🎯 Summary

**For fastest deployment:** Use `./deploy-fast.sh` (2-3 minutes)

**For local testing:** Use `npm run dev` (instant, uses production DB)

**For isolated testing:** Use `./dev-local.sh` (instant, uses emulators)

All API routes work locally! 🎉
