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
 */
function initializeFirebaseAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  return adminApp;
}

/**
 * Get Firebase Admin Auth instance (lazy)
 */
export function getAdminAuth(): Auth {
  if (!adminAuthInstance) {
    const app = initializeFirebaseAdmin();
    adminAuthInstance = getAuth(app);
  }
  return adminAuthInstance;
}

/**
 * Get Firebase Admin Firestore instance (lazy)
 */
export function getAdminDb(): Firestore {
  if (!adminDbInstance) {
    const app = initializeFirebaseAdmin();
    adminDbInstance = getFirestore(app);
  }
  return adminDbInstance;
}

// Keep backward compatibility with named exports
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

export default function getAdminApp(): App {
  return initializeFirebaseAdmin();
}
