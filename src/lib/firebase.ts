// Firebase initialization. Singleton across the app.
// Auth + Firestore + Storage. Analytics is browser-only and best-effort.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCZI9Vyx6e1LCZi2SAP-O_M2y6WuHpkgFo",
  authDomain: "x3-communi.firebaseapp.com",
  projectId: "x3-communi",
  storageBucket: "x3-communi.firebasestorage.app",
  messagingSenderId: "641156177771",
  appId: "1:641156177771:web:25a7fb32ea2878e243b62e",
  measurementId: "G-X7XDHGXMLC",
};

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app);

// Lazy analytics — browser only, never throws.
export async function initAnalytics() {
  if (typeof window === "undefined") return null;
  try {
    const { getAnalytics, isSupported } = await import("firebase/analytics");
    if (await isSupported()) return getAnalytics(app);
  } catch {
    /* ignore */
  }
  return null;
}
