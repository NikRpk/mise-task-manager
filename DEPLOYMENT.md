# Deployment Guide - HelloFresh Task Manager

This guide walks you through deploying the HelloFresh Task Manager to Firebase Hosting.

## Prerequisites

You should have already completed the Firebase Console setup from `FIREBASE_SETUP.md`:
- ✅ Created Firebase project "dach-ai-mvps"
- ✅ Configured hosting for `hf-tasks.web.app`
- ✅ Enabled Google Authentication
- ✅ Enabled Firestore Database
- ✅ Set up environment variables in `.env.local`

## Step 1: Install Firebase CLI

If you haven't already installed the Firebase CLI globally:

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
npm run firebase:login
```

This will open a browser window for you to authenticate with your Google account.

## Step 3: Initialize Firebase (First Time Only)

Run the initialization command:

```bash
npm run firebase:init
```

When prompted:
1. **Select features**: Use arrow keys and spacebar to select:
   - Firestore
   - Hosting
2. **Select project**: Choose "dach-ai-mvps" from the list
3. **Firestore rules**: Press Enter to use `firestore.rules` (already created)
4. **Firestore indexes**: Press Enter to use `firestore.indexes.json` (already created)
5. **Hosting directory**: Type `out` and press Enter
6. **Configure as SPA**: Type `y` and press Enter
7. **Set up automatic builds**: Type `n` and press Enter
8. **Overwrite files**: Type `n` (we already have the right config)

## Step 4: Build the Application

Next.js needs to export static files for Firebase Hosting:

```bash
npm run build
```

This will:
1. Build the Next.js application
2. Export static files to the `out/` directory

**Note**: If you get build errors, check:
- All dependencies are installed: `npm install`
- Environment variables are set in `.env.local`
- No TypeScript errors: `npm run lint`

## Step 5: Deploy Firestore Rules & Indexes

Before deploying the app, deploy the security rules and indexes:

```bash
npm run firebase:rules
npm run firebase:indexes
```

These commands ensure:
- Security rules are enforced (only authenticated users with proper roles can access data)
- Database queries are optimized with the right indexes

## Step 6: Deploy to Firebase Hosting

Now deploy the application:

```bash
npm run firebase:deploy
```

This will:
1. Build the application
2. Upload files to Firebase Hosting
3. Deploy to `https://hf-tasks.web.app`

## Step 7: Verify Deployment

1. Open your browser and go to: `https://hf-tasks.web.app`
2. Click "Sign in with Google"
3. Sign in with your HelloFresh Google account
4. Create your first project
5. Create a test task
6. Verify all features work:
   - Task creation/editing
   - Project switching
   - Settings (color scheme, project-specific options)
   - User profile dropdown

## Deployment Scripts Reference

### `npm run firebase:deploy`
Builds and deploys the entire application to hosting.

### `npm run firebase:deploy:all`
Deploys everything (hosting, rules, indexes).

### `npm run firebase:rules`
Deploys only Firestore security rules.

### `npm run firebase:indexes`
Deploys only Firestore indexes.

## Troubleshooting

### Build Errors

**Error: "Firebase config not found"**
- Solution: Ensure `.env.local` exists and has all required variables

**Error: "Module not found"**
- Solution: Run `npm install` to install all dependencies

### Deployment Errors

**Error: "Permission denied"**
- Solution: Run `npm run firebase:login` again
- Ensure you're logged in with an account that has access to the Firebase project

**Error: "Project not found"**
- Solution: Run `npm run firebase:init` and select the correct project

### Runtime Errors

**Error: "Authentication failed"**
- Solution: Verify Google Auth is enabled in Firebase Console
- Check that authorized domains include `hf-tasks.web.app`

**Error: "Missing permissions"**
- Solution: Deploy Firestore rules: `npm run firebase:rules`
- Verify rules are correctly set in Firebase Console

**Error: "Database query failed"**
- Solution: Deploy Firestore indexes: `npm run firebase:indexes`
- Check Firestore Console for missing index errors

## Continuous Deployment

### Manual Deployment
Whenever you make changes:

```bash
npm run firebase:deploy
```

### GitHub Actions (Optional)
You can set up automated deployments with GitHub Actions:

1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate a new private key (JSON)
3. In GitHub repo → Settings → Secrets → New secret
4. Add: `FIREBASE_TOKEN` (from `firebase login:ci`)
5. Create `.github/workflows/deploy.yml` (contact dev team for template)

## Rollback

If you need to rollback to a previous version:

1. Go to Firebase Console → Hosting
2. Click on "Release history"
3. Find the previous working version
4. Click "Rollback"

## Monitoring

### Check Hosting Status
```bash
firebase hosting:channel:list
```

### View Logs
Go to Firebase Console → Analytics → Events

### Monitor Usage
Go to Firebase Console → Usage and billing

## Security Checklist

Before going to production:
- [ ] Firestore rules are deployed
- [ ] IAM authentication is configured (HelloFresh domain only)
- [ ] Service account key is NOT in git
- [ ] Environment variables are set correctly
- [ ] HTTPS is enforced (automatic with Firebase Hosting)
- [ ] Test user permissions (VIEW/EDIT/ADMIN roles)

## Support

If you encounter issues during deployment:
1. Check the [Firebase documentation](https://firebase.google.com/docs)
2. Review logs in Firebase Console
3. Contact the dev team for assistance

---

**Deployment complete!** Your HelloFresh Task Manager is now live at `https://hf-tasks.web.app` 🎉
