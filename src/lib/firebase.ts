import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAkMhUi_1O6Y8qK3kYTH7HdlHLbv1ocj34",
  authDomain: "fitlife-4323e.firebaseapp.com",
  projectId: "fitlife-4323e",
  storageBucket: "fitlife-4323e.firebasestorage.app",
  messagingSenderId: "556953928361",
  appId: "1:556953928361:web:aaa65b1811ff02dab75fb8",
  measurementId: "G-YN15ZFB5PV",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
