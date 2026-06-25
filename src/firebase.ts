import { initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
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
