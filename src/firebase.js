// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// ============================================================
// REPLACE THESE VALUES WITH YOUR FIREBASE PROJECT CREDENTIALS
// Get them from: Firebase Console > Project Settings > General
// ============================================================
// Config loaded from .env (copy .env.example → .env and fill in values)
// In production, set these as GitHub Secrets for CI/CD
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence (bonus feature)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Offline persistence unavailable: multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence not supported in this browser');
  }
});

export default app;
