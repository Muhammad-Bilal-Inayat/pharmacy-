import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  Firestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  onSnapshot,
  query,
  limit,
  writeBatch
} from 'firebase/firestore';

// Silence verbose connection warnings during offline/retry states
try {
  setLogLevel('silent');
} catch {}

// Environment or config matching user provided Firebase project
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAIuBKOH7I3CezUiPw5H6x9bnaBtgAF9SY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rock-bus-wmgf5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rock-bus-wmgf5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rock-bus-wmgf5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "991417835461",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:991417835461:web:19ce6f28c7d5eb3092b5ac",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-remixremixremixp-767855d9-a053-4909-a205-42a5d1c490d1",
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const existing = getApps();
    if (existing.length > 0) {
      app = existing[0];
    } else {
      app = initializeApp(envConfig);
    }
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    const fbApp = getFirebaseApp();
    auth = getAuth(fbApp);
  }
  return auth;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    const fbApp = getFirebaseApp();
    const dbId = envConfig.firestoreDatabaseId;
    const firestoreSettings = {
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true
    };

    try {
      if (dbId && dbId !== '(default)') {
        try {
          firestore = initializeFirestore(fbApp, firestoreSettings, dbId);
        } catch {
          try {
            firestore = getFirestore(fbApp, dbId);
          } catch {
            firestore = initializeFirestore(fbApp, firestoreSettings);
          }
        }
      } else {
        try {
          firestore = initializeFirestore(fbApp, firestoreSettings);
        } catch {
          firestore = getFirestore(fbApp);
        }
      }
    } catch (e) {
      console.info('Firestore initialized in offline-first mode');
      try {
        firestore = getFirestore(fbApp);
      } catch {
        // Fallback
      }
    }
  }
  return firestore!;
}

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const authInstance = getFirebaseAuth();
    const result = await signInWithPopup(authInstance, googleProvider);
    return result.user;
  } catch (error: any) {
    console.warn('Google sign-in fallback notice:', error?.message);
    throw error;
  }
}

/**
 * Sign in with Email / Password
 */
export async function loginWithEmailPassword(email: string, pass: string): Promise<FirebaseUser> {
  const authInstance = getFirebaseAuth();
  const res = await signInWithEmailAndPassword(authInstance, email, pass);
  return res.user;
}

/**
 * Register with Email / Password
 */
export async function registerWithEmailPassword(email: string, pass: string): Promise<FirebaseUser> {
  const authInstance = getFirebaseAuth();
  const res = await createUserWithEmailAndPassword(authInstance, email, pass);
  return res.user;
}

/**
 * Sign out
 */
export async function logoutFirebase(): Promise<void> {
  const authInstance = getFirebaseAuth();
  await signOut(authInstance);
}

/**
 * Save / Sync record directly to Cloud Firestore
 */
export async function saveRecordToFirestore(collectionName: string, id: string, data: any): Promise<boolean> {
  try {
    const db = getFirebaseFirestore();
    if (!db) return false;
    const docRef = doc(db, collectionName, id);
    const cleanData = {
      ...data,
      updatedAt: data.updatedAt || new Date().toISOString()
    };
    try {
      await setDoc(docRef, cleanData, { merge: true });
      return true;
    } catch (err: any) {
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        try {
          const authInstance = getFirebaseAuth();
          if (!authInstance.currentUser) {
            await signInAnonymously(authInstance);
          }
          await setDoc(docRef, cleanData, { merge: true });
          return true;
        } catch (retryErr) {
          return false;
        }
      }
      return false;
    }
  } catch (err) {
    return false;
  }
}

/**
 * Fetch all records from Cloud Firestore collection
 */
export async function fetchCollectionFromFirestore(collectionName: string): Promise<any[]> {
  try {
    const db = getFirebaseFirestore();
    if (!db) return [];
    const colRef = collection(db, collectionName);
    try {
      const snap = await getDocs(colRef);
      const results: any[] = [];
      snap.forEach(d => {
        results.push({ id: d.id, ...d.data() });
      });
      return results;
    } catch (err: any) {
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        try {
          const authInstance = getFirebaseAuth();
          if (!authInstance.currentUser) {
            await signInAnonymously(authInstance);
          }
          const snap = await getDocs(colRef);
          const results: any[] = [];
          snap.forEach(d => {
            results.push({ id: d.id, ...d.data() });
          });
          return results;
        } catch (retryErr) {
          return [];
        }
      } else if (err?.code === 'unavailable') {
        return [];
      }
      return [];
    }
  } catch (err) {
    return [];
  }
}

/**
 * Realtime listener for Firestore collection
 */
export function subscribeToFirestoreCollection(collectionName: string, onUpdate: (data: any[]) => void): () => void {
  try {
    const db = getFirebaseFirestore();
    if (!db) return () => {};
    const colRef = collection(db, collectionName);
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const results: any[] = [];
      snap.forEach(d => results.push({ id: d.id, ...d.data() }));
      onUpdate(results);
    }, async (error) => {
      if (error?.code === 'permission-denied' || error?.message?.includes('Missing or insufficient permissions')) {
        try {
          const authInstance = getFirebaseAuth();
          if (!authInstance.currentUser) {
            await signInAnonymously(authInstance);
          }
        } catch (e) {}
      } else if (error?.code === 'unavailable') {
        // Operates in offline mode quietly
      }
    });
    return unsubscribe;
  } catch (e) {
    return () => {};
  }
}

export { onAuthStateChanged };
export type { FirebaseUser };
