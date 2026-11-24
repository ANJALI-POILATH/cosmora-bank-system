// Firebase Web (modular) SDK for the cosmora-bank-732ca project.
// Only the modules imported here end up in the bundle.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// A Firebase web config is not a secret: it only identifies the project.
// Access is controlled by Authentication and the rules in firestore.rules.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'REPLACE_WITH_FIREBASE_WEB_API_KEY',
  authDomain: 'cosmora-bank-732ca.firebaseapp.com',
  projectId: 'cosmora-bank-732ca',
  storageBucket: 'cosmora-bank-732ca.firebasestorage.app',
  messagingSenderId: '906080243540',
  // Firebase console > Project settings > Your apps. Firestore works without it.
  ...(env.VITE_FIREBASE_APP_ID && { appId: env.VITE_FIREBASE_APP_ID }),
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
