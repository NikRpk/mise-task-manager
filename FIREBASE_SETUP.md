# Firebase Console Setup Guide

Follow these steps to set up your Firebase project for the HelloFresh Task Manager.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: **"HelloFresh Task Manager"** or **"HF Tasks"**
4. Choose your existing Firebase organization (HelloFresh)
5. Enable Google Analytics if desired (optional)
6. Click **"Create project"**

## Step 2: Add Web App

1. In your new project, click the **Web icon** `</>`
2. Enter app nickname: **"HF Task Manager Web"**
3. **Check** "Also set up Firebase Hosting"
4. Click **"Register app"**
5. **IMPORTANT**: Copy the Firebase configuration object - you'll need this later:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. Click **"Continue to console"**

## Step 3: Configure Firebase Hosting

1. In the left sidebar, go to **Hosting**
2. Click **"Get started"** (if first time) or view your existing site
3. Click **"Add custom domain"**
4. Enter domain: **`hf-tasks.web.app`**
5. Follow DNS verification steps if required
6. Wait for DNS propagation (can take up to 24 hours, but usually faster)

**Note**: If `hf-tasks.web.app` is not available or verification fails, you can use the default hosting URL (`your-project-id.web.app`) for now and set up custom domain later.

## Step 4: Enable Google Authentication

1. In the left sidebar, go to **Build** → **Authentication**
2. Click **"Get started"**
3. Click on **"Sign-in method"** tab
4. Click **"Google"** provider
5. **Enable** the toggle
6. Set support email (your HelloFresh email)
7. Click **"Save"**

## Step 5: Set Up Identity Platform (IAM)

1. In the Authentication section, look for **"Upgrade"** banner or **"Identity Platform"** option
2. Click **"Upgrade to Identity Platform"** (no extra cost for basic features)
3. Once upgraded, go to **Settings** tab in Authentication
4. Scroll to **"Authorized domains"**
5. Click **"Add domain"**
6. Add your HelloFresh domain: **`hellofresh.com`** (or your company domain)
7. Configure **IAM policies** (optional - restricts sign-in to company accounts):
   - Go to **"Sign-in providers"** → Google
   - Under **"Advanced options"**, configure domain restriction
   - Add: `hd=hellofresh.com` (restricts to HelloFresh Google accounts only)

**Note**: Domain restriction ensures only HelloFresh Google accounts can sign in.

## Step 6: Enable Firestore Database

1. In the left sidebar, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll deploy security rules later)
4. Select location: **`europe-west3 (Frankfurt)`** (closest to HelloFresh)
   - Or choose your preferred European region
5. Click **"Enable"**

## Step 7: Generate Service Account Key

1. In the left sidebar, click the **gear icon** ⚙️ → **"Project settings"**
2. Go to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** in the confirmation dialog
5. A JSON file will download - **SAVE THIS SECURELY**
6. **DO NOT commit this file to git!**

The file should look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## Step 8: Provide Configuration to Developer

Once you've completed all the above steps, provide me with:

### A. Firebase Web App Config (from Step 2)

```
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
```

### B. Service Account Key (from Step 7)

Either:
- Share the entire JSON file contents securely (I'll format it for `.env.local`)
- Or provide each field individually

## Summary Checklist

Before telling me to start implementation, verify you have:

- [ ] Created Firebase project in your organization
- [ ] Added Web App and have the config object
- [ ] Configured hosting for `hf-tasks.web.app` (or have default `.web.app` URL)
- [ ] Enabled Google Authentication
- [ ] Upgraded to Identity Platform (optional but recommended for IAM)
- [ ] Created Firestore Database
- [ ] Generated and downloaded Service Account key JSON
- [ ] Have all credentials ready to share

## What Happens Next

Once you provide the credentials, I will:

1. Create `.env.local` with your Firebase configuration
2. Implement all authentication code
3. Set up Firestore database structure
4. Create security rules
5. Build and test the application locally
6. Deploy to `hf-tasks.web.app`

---

**Questions or issues during setup?** Let me know and I'll help troubleshoot!
