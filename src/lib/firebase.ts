import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

function getApp(): FirebaseApp | undefined {
  if (!firebaseConfig.apiKey) return undefined;
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

const app = getApp();

export const auth = app ? getAuth(app) : (undefined as unknown as Auth);
export const db = app ? getFirestore(app) : (undefined as unknown as Firestore);
export const storage = app ? getStorage(app) : (undefined as unknown as FirebaseStorage);
export default app;
