# 🚀 Deployment Guide - Ultra Simple!

## Zero Docker, Zero Complexity

Cloud Run uses **Buildpacks** that auto-detect Next.js - no Dockerfile needed!

## 📋 Deployment Steps

### First Time Only:

```bash
# Step 1: Delete old service (if exists)
chmod +x delete-service.sh
./delete-service.sh

# Step 2: Grant Firebase permissions (one-time)
chmod +x setup-permissions.sh
./setup-permissions.sh

# Step 3: Deploy!
chmod +x deploy.sh
./deploy.sh
```

### Every Subsequent Deployment:

```bash
./deploy.sh
```

That's literally it! 🎉

## 🔧 How It Works

1. **Build**: Buildpacks auto-detect Next.js and build your app
2. **Runtime**: Cloud Run's service account automatically gets Firebase Admin access via ADC
3. **No Docker**: No Dockerfile, no build configs, no complexity
4. **No Secrets**: Application Default Credentials handle everything

## 🛡️ Security

- **Client-side**: Firebase config is public (embedded in bundle)
- **Server-side**: Uses ADC with IAM role `roles/firebase.admin`
- **Zero manual credentials**: Cloud handles it all

## ⚡ Quick Reference

```bash
# Full reset and deploy
./delete-service.sh && ./setup-permissions.sh && ./deploy.sh

# Just deploy
./deploy.sh
```

**Simple. Clean. Standard.**
