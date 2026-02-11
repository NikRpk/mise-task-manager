// Server-side Firebase Admin SDK configuration
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuthInstance: Auth | null = null;
let adminDbInstance: Firestore | null = null;

/**
 * Initialize Firebase Admin (lazy initialization)
 * Called on first access to avoid initialization during build time
 * 
 * Uses Application Default Credentials (ADC) in production (Cloud Run)
 * Falls back to explicit credentials from env vars in development
 */
function initializeFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  // In production (Cloud Run), use Application Default Credentials
  // In development, use explicit credentials from .env.local
  const isProduction = process.env.NODE_ENV === 'production' && !process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  
  if (isProduction) {
    // Cloud Run automatically provides credentials via ADC
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_ADMIN_PROJECT_ID,
    });
  } else {
    // Local development: use explicit credentials
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  return adminApp;
}

// Keep backward compatibility with named exports - using proxies for lazy initialization
function getAdminAuth(): Auth {
  if (!adminAuthInstance) {
    const app = initializeFirebaseAdmin();
    adminAuthInstance = getAuth(app);
  }
  return adminAuthInstance;
}

function getAdminDb(): Firestore {
  if (!adminDbInstance) {
    const app = initializeFirebaseAdmin();
    adminDbInstance = getFirestore(app, 'task-and-note-manager');
  }
  return adminDbInstance;
}
export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    return getAdminAuth()[prop as keyof Auth];
  }
});

export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    return getAdminDb()[prop as keyof Firestore];
  }
});
