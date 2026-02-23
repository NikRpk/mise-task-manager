# Colima Quick Start Guide

## ✅ Colima is installed and running!

### Current Configuration:
- **CPUs:** 4
- **Memory:** 8GB RAM
- **Disk:** 50GB
- **Status:** Running

### Daily Usage:

```bash
# Start Colima (if stopped)
colima start

# Check status
colima status

# Stop Colima (to save resources)
colima stop

# Restart Colima
colima restart
```

### Deploy with Local Build:

```bash
# Quick deploy (builds locally with Colima)
npm run deploy
```

This will:
1. ✅ Build Docker image locally using Artifactory (HelloFresh compliant)
2. ✅ Push to Google Container Registry
3. ✅ Deploy to Cloud Run
4. ✅ Deploy to Firebase Hosting

**Speed:** ~3-4 minutes (vs 7-8 minutes with Cloud Build)

### When to use what:

| Scenario | Command | Speed |
|----------|---------|-------|
| Quick iteration, testing changes | `npm run deploy` | Fast (3-4 min) |
| No Docker/Colima available | `gcloud run deploy --source .` | Slow (7-8 min) |

### Troubleshooting:

**"Docker is not running"**
```bash
colima start
```

**"Cannot connect to Docker daemon"**
```bash
# Make sure Colima is running
colima status

# If stopped, start it
colima start
```

**Build is slow**
First build takes longer (downloads base images). Subsequent builds are cached and much faster.

### Resource Management:

Colima uses about 1-2GB RAM when idle, 4-8GB when building.

To free up resources when not deploying:
```bash
colima stop
```

To start again later:
```bash
colima start
```

---

## What's Running:

Check running containers:
```bash
docker ps
```

Check images:
```bash
docker images
```

Clean up old images:
```bash
docker system prune -af
```
