# 🚀 Deployment Audit & Checklist

## ✅ What's Been Fixed

### 1. **Removed Secret Manager Complexity**
   - ❌ **Before**: Required manual Secret Manager setup with `FIREBASE_ADMIN_*` secrets
   - ✅ **After**: Uses Application Default Credentials (ADC) - Google's recommended approach

### 2. **Firebase Admin SDK Configuration**
   - ✅ `lib/firebase-admin.ts` now auto-detects environment:
     - **Production (Cloud Run)**: Uses ADC automatically
     - **Development (Local)**: Uses explicit credentials from `.env.local`

### 3. **Clean Build Process**
   - ✅ Removed old `cloudbuild.yaml` with secret references
   - ✅ Created new `cloudbuild.yaml` that:
     - Passes Firebase config as Docker build args
     - No Secret Manager dependencies
     - Uses ADC for runtime Firebase Admin access

### 4. **Simplified Deployment Scripts**
   - ✅ `deploy-simple.sh`: One command deployment
   - ✅ `setup-permissions.sh`: One-time IAM setup
   - ✅ `delete-service.sh`: Clean slate if needed

## 🎯 Deployment Blockers - RESOLVED

### Previously Identified Issues:
1. ❌ **Secret Manager references**: FIXED - removed all secret dependencies
2. ❌ **Build-time vs runtime env vars**: FIXED - using Docker build args properly
3. ❌ **Existing service with old config**: Use `delete-service.sh` to clean slate

### Remaining Considerations:
- ✅ Dockerfile is correct (standalone build)
- ✅ `.dockerignore` properly excludes unnecessary files
- ✅ `next.config.ts` has `output: 'standalone'`
- ✅ No leftover service.yaml or run.yaml files

## 📋 Deployment Steps

### First Time Deployment:

```bash
# Step 1: Delete old service with broken config (if exists)
chmod +x delete-service.sh
./delete-service.sh

# Step 2: Grant Firebase permissions to Cloud Run service account (one-time)
chmod +x setup-permissions.sh
./setup-permissions.sh

# Step 3: Deploy
chmod +x deploy-simple.sh
./deploy-simple.sh
```

### Subsequent Deployments:

```bash
./deploy-simple.sh
```

That's it!

## 🔍 How It Works

### Build Time (Docker):
1. Cloud Build reads `cloudbuild.yaml`
2. Passes `NEXT_PUBLIC_*` vars as Docker build args
3. Next.js embeds these in the client bundle during build
4. Creates standalone output

### Runtime (Cloud Run):
1. Cloud Run service starts with the built image
2. `NODE_ENV=production` is set (automatically)
3. Firebase Admin SDK detects Cloud Run environment
4. Uses Application Default Credentials (ADC) automatically
5. Service account has `roles/firebase.admin` (from setup-permissions.sh)
6. No manual credentials needed!

## 🛡️ Security Model

- **Client-side**: Firebase Web SDK config embedded in bundle (public, safe)
- **Server-side**: Firebase Admin SDK uses ADC with proper IAM roles
- **No secrets** in environment variables or Secret Manager needed
- **Zero credentials** to manage manually

## ⚠️ Known Issues

### Issue: "Cross-Origin-Opener-Policy policy would block the window.closed call"
- **Status**: Expected browser warning from Google Sign-In popup
- **Impact**: None - sign-in works correctly
- **Action**: Can be ignored

### Issue: API routes return 401 after login
- **Cause**: Firebase Admin SDK needs proper credentials
- **Fix**: Ensure `setup-permissions.sh` was run
- **Verify**: Check service account has `roles/firebase.admin`

## 🎉 Summary

**Previous Approach**: Complex Secret Manager setup, error-prone, many steps
**New Approach**: Standard Google Cloud ADC pattern, one command, zero secrets

This is the **official Google Cloud recommended approach** for Firebase on Cloud Run!
