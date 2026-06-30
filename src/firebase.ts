import { initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { FIREBASE_CONFIG } from "./firebase.config";

/** True once a real Firebase project is configured. */
export const FIREBASE_READY =
  !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.databaseURL;

let app: FirebaseApp | null = null;
let db: Database | null = null;

/** Lazily initialise Firebase; returns null when not configured. */
export function getDb(): Database | null {
  if (!FIREBASE_READY) return null;
  if (!db) {
    app = initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);
  }
  return db;
}

let authPromise: Promise<void> | null = null;

/**
 * Sign in anonymously so the database's security rules can require
 * `auth != null` for every read/write — without this, ANY unauthenticated
 * client (including a bare curl request) can read/write any room. This is
 * invisible to kids/parents: no sign-in screen, just a background token.
 * FamilySync and worldSync must await this before touching the database.
 */
export function ensureAuth(): Promise<void> {
  if (!FIREBASE_READY) return Promise.resolve();
  if (authPromise) return authPromise;
  if (!getDb() || !app) return Promise.resolve();
  const auth = getAuth(app);
  authPromise = new Promise<void>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub();
        resolve();
      }
    });
    signInAnonymously(auth).catch(() => {
      // Network/config issue — resolve anyway so the app doesn't hang;
      // reads/writes will simply fail under strict rules until retried.
      resolve();
    });
  });
  return authPromise;
}
