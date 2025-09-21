import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';


const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with React Native AsyncStorage persistence when available.
// Use dynamic require to support different firebase versions and avoid TS import errors.
let authInstance: any;
try {
  // try react-native specific entry
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rnAuth = require('firebase/auth/react-native');
  if (rnAuth && typeof rnAuth.getReactNativePersistence === 'function') {
    authInstance = initializeAuth(app, { persistence: rnAuth.getReactNativePersistence(AsyncStorage) });
  }
} catch (e) {
  // fallback to checking firebase/auth for helper
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const authModule = require('firebase/auth');
    if (authModule && typeof authModule.getReactNativePersistence === 'function') {
      authInstance = initializeAuth(app, { persistence: authModule.getReactNativePersistence(AsyncStorage) });
    }
  } catch (e2) {
    // will handle below
  }
}

if (!authInstance) {
  // final fallback: initialize without RN persistence
  try {
    authInstance = initializeAuth(app);
    // eslint-disable-next-line no-console
    console.warn('Firebase Auth: React Native persistence not available; auth state will not persist across app restarts.');
  } catch (e) {
    // As a last resort, export undefined and let callers handle errors
    // eslint-disable-next-line no-console
    console.error('Failed to initialize Firebase Auth', e);
  }
}

export const auth = authInstance;

export const db = getFirestore(app);