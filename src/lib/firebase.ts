// Firebase initialization. Singleton across the app.
// Auth + Firestore + Storage. Analytics is browser-only and best-effort.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCpt5LYGh-4fvO9AFmuY5rlv-LKUDICrHs",
  authDomain: "x3c-app.firebaseapp.com",
  projectId: "x3c-app",
  storageBucket: "x3c-app.firebasestorage.app",
  messagingSenderId: "755689959485",
  appId: "1:755689959485:web:0f42f0a83a7fe26514ba54",
  measurementId: "G-NZ4264PTYH",
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
