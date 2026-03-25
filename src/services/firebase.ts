import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, limit, getDocFromServer, addDoc } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfigFromFile from './firebase-applet-config.json';

// Use environment variables if available, otherwise fallback to the config file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigFromFile.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigFromFile.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigFromFile.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigFromFile.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigFromFile.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigFromFile.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigFromFile.firestoreDatabaseId,
};

// Security check: authDomain should NOT be the app domain
if (firebaseConfig.authDomain.includes('railway.app') || firebaseConfig.authDomain.includes('run.app')) {
  console.warn('CRITICAL: VITE_FIREBASE_AUTH_DOMAIN is set to your app domain. This will cause login failures.');
  console.warn('It should be your Firebase project domain, e.g., gen-lang-client-0692032472.firebaseapp.com');
}

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const loginWithGoogle = async () => {
  try {
    console.log('Attempting Google Login from domain:', window.location.hostname);
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    if (error.code === 'auth/unauthorized-domain') {
      console.error('Firebase Auth Error: Unauthorized Domain.');
      console.error('Current Domain:', window.location.hostname);
      console.error('Please ensure this domain is added to Firebase Console -> Authentication -> Settings -> Authorized domains');
      alert(`Login failed: Unauthorized Domain (${window.location.hostname}). Please add this domain to your Firebase Console settings.`);
    }
    throw error;
  }
};
export const logout = () => signOut(auth);

// Firestore Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export { doc, collection, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where, orderBy, limit, getDocFromServer, addDoc };
