// Client-side Firebase configuration
import { initializeApp, getApps, getApp as getFirebaseApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firebaseDb: Firestore | null = null;
let firebaseGoogleProvider: GoogleAuthProvider | null = null;

/**
 * Initialize Firebase app (lazy, browser-only)
 * Only initializes when actually running in browser, not during SSR/build
 */
function initializeFirebaseApp(): FirebaseApp {
  // Skip initialization during SSR/build
  if (typeof window === 'undefined') {
    // Return a dummy object during SSR - will never be used in practice
    // because client components don't execute during static generation
    return {} as FirebaseApp;
  }

  if (firebaseApp) {
    return firebaseApp;
  }

  if (getApps().length > 0) {
    firebaseApp = getFirebaseApp();
    return firebaseApp;
  }

  firebaseApp = initializeApp(firebaseConfig);
  return firebaseApp;
}

/**
 * Get Firebase Auth instance (lazy)
 */
export function getFirebaseAuthInstance(): Auth | null {
  // Always check if we're in browser before attempting to initialize
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!firebaseAuth) {
    const app = initializeFirebaseApp();
    firebaseAuth = getAuth(app);
  }
  return firebaseAuth;
}

/**
 * Get Firebase Firestore instance (lazy)
 */
export function getFirebaseDbInstance(): Firestore | null {
  // Always check if we're in browser before attempting to initialize
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!firebaseDb) {
    const app = initializeFirebaseApp();
    firebaseDb = getFirestore(app);
  }
  return firebaseDb;
}

/**
 * Get Google Auth Provider instance (lazy)
 */
export function getGoogleProviderInstance(): GoogleAuthProvider | null {
  // Always check if we're in browser before attempting to initialize
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!firebaseGoogleProvider) {
    firebaseGoogleProvider = new GoogleAuthProvider();
  }
  return firebaseGoogleProvider;
}

// Backward compatibility - use Proxies that delegate to lazy getters
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    console.log('[FIREBASE PROXY] Auth proxy accessed, property:', prop);
    const authInstance = getFirebaseAuthInstance();
    console.log('[FIREBASE PROXY] Auth instance:', authInstance);
    if (!authInstance) {
      throw new Error('Firebase Auth not initialized - must be used in browser context');
    }
    const value = authInstance[prop as keyof Auth];
    console.log('[FIREBASE PROXY] Returning value:', typeof value, value);
    return value;
  }
});

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    const dbInstance = getFirebaseDbInstance();
    if (!dbInstance) {
      throw new Error('Firebase Firestore not initialized - must be used in browser context');
    }
    return dbInstance[prop as keyof Firestore];
  }
});

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_target, prop) {
    console.log('[FIREBASE PROXY] GoogleProvider proxy accessed, property:', prop);
    const providerInstance = getGoogleProviderInstance();
    console.log('[FIREBASE PROXY] Provider instance:', providerInstance);
    if (!providerInstance) {
      throw new Error('Google Auth Provider not initialized - must be used in browser context');
    }
    const value = providerInstance[prop as keyof GoogleAuthProvider];
    console.log('[FIREBASE PROXY] Returning value:', typeof value, value);
    return value;
  }
});

// Initialize Analytics (only in browser and if supported)
export const analytics = typeof window !== 'undefined' 
  ? isSupported().then(yes => yes ? getAnalytics(initializeFirebaseApp()) : null)
  : Promise.resolve(null);

export default initializeFirebaseApp;
