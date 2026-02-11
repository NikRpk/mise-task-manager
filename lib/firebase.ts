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

// Initialize on first module evaluation in browser
if (typeof window !== 'undefined') {
  firebaseApp = initializeFirebaseApp();
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);
  firebaseGoogleProvider = new GoogleAuthProvider();
}

// Export the instances directly (will be null during SSR, initialized in browser)
export const auth = firebaseAuth as Auth;
export const db = firebaseDb as Firestore;
export const googleProvider = firebaseGoogleProvider as GoogleAuthProvider;

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

// Initialize Analytics (only in browser and if supported)
export const analytics = typeof window !== 'undefined' 
  ? isSupported().then(yes => yes ? getAnalytics(firebaseApp!) : null)
  : Promise.resolve(null);

export default initializeFirebaseApp;
