// Client-side Firebase configuration
import { initializeApp, getApps, getApp as getFirebaseApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

// #region agent log
if (typeof window !== 'undefined') {
  fetch('http://127.0.0.1:7243/ingest/95e11960-e412-410c-be98-153e2d25f6e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/firebase.ts:MODULE_LOAD',message:'Firebase client config module loading in browser',data:{hasApiKey:!!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,hasAuthDomain:!!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,hasProjectId:!!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,apiKeyValue:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,projectIdValue:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID},timestamp:Date.now(),runId:'initial',hypothesisId:'H1'})}).catch(()=>{});
}
// #endregion

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// #region agent log
if (typeof window !== 'undefined') {
  fetch('http://127.0.0.1:7243/ingest/95e11960-e412-410c-be98-153e2d25f6e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/firebase.ts:CONFIG_CREATED',message:'Firebase config object created',data:{config:firebaseConfig,hasAllValues:!!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)},timestamp:Date.now(),runId:'initial',hypothesisId:'H1'})}).catch(()=>{});
}
// #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/95e11960-e412-410c-be98-153e2d25f6e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/firebase.ts:INIT_SSR',message:'Skipping Firebase init during SSR',data:{},timestamp:Date.now(),runId:'initial',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    // Return a dummy object during SSR - will never be used in practice
    // because client components don't execute during static generation
    return {} as FirebaseApp;
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/95e11960-e412-410c-be98-153e2d25f6e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/firebase.ts:INIT_BROWSER_START',message:'Starting Firebase init in browser',data:{alreadyInitialized:!!firebaseApp,existingApps:getApps().length},timestamp:Date.now(),runId:'initial',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  if (firebaseApp) {
    return firebaseApp;
  }

  if (getApps().length > 0) {
    firebaseApp = getFirebaseApp();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/95e11960-e412-410c-be98-153e2d25f6e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/firebase.ts:REUSE_APP',message:'Reusing existing Firebase app',data:{},timestamp:Date.now(),runId:'initial',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    return firebaseApp;
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/95e11960-e412-410c-be98-153e2d25f6e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/firebase.ts:BEFORE_INIT',message:'About to call initializeApp',data:{configKeys:Object.keys(firebaseConfig),configValues:firebaseConfig},timestamp:Date.now(),runId:'initial',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  try {
    firebaseApp = initializeApp(firebaseConfig);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/95e11960-e412-410c-be98-153e2d25f6e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/firebase.ts:INIT_SUCCESS',message:'Firebase app initialized successfully',data:{appName:firebaseApp.name},timestamp:Date.now(),runId:'initial',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/95e11960-e412-410c-be98-153e2d25f6e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/firebase.ts:INIT_ERROR',message:'Firebase initialization failed',data:{error:(error as Error).message,errorCode:(error as any).code},timestamp:Date.now(),runId:'initial',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    throw error;
  }

  return firebaseApp;
}

/**
 * Get Firebase Auth instance (lazy)
 */
export function getFirebaseAuthInstance(): Auth {
  if (!firebaseAuth && typeof window !== 'undefined') {
    const app = initializeFirebaseApp();
    firebaseAuth = getAuth(app);
  }
  return firebaseAuth as Auth;
}

/**
 * Get Firebase Firestore instance (lazy)
 */
export function getFirebaseDbInstance(): Firestore {
  if (!firebaseDb && typeof window !== 'undefined') {
    const app = initializeFirebaseApp();
    firebaseDb = getFirestore(app);
  }
  return firebaseDb as Firestore;
}

/**
 * Get Google Auth Provider instance (lazy)
 */
export function getGoogleProviderInstance(): GoogleAuthProvider {
  if (!firebaseGoogleProvider && typeof window !== 'undefined') {
    firebaseGoogleProvider = new GoogleAuthProvider();
  }
  return firebaseGoogleProvider as GoogleAuthProvider;
}

// Backward compatibility - use Proxies that delegate to lazy getters
export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const authInstance = getFirebaseAuthInstance();
    return authInstance?.[prop as keyof Auth];
  }
});

export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    const dbInstance = getFirebaseDbInstance();
    return dbInstance?.[prop as keyof Firestore];
  }
});

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_target, prop) {
    const providerInstance = getGoogleProviderInstance();
    return providerInstance?.[prop as keyof GoogleAuthProvider];
  }
});

// Initialize Analytics (only in browser and if supported)
export const analytics = typeof window !== 'undefined' 
  ? isSupported().then(yes => yes ? getAnalytics(initializeFirebaseApp()) : null)
  : Promise.resolve(null);

export default initializeFirebaseApp;
