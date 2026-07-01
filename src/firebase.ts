import { initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import {
  browserLocalPersistence,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
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

export function getAuthInstance(): Auth | null {
  if (!FIREBASE_READY) return null;
  if (!getDb() || !app) return null;
  return getAuth(app);
}

// --- Auth error surfacing --------------------------------------------------
// The single most common failure is that the Authentication product / the
// Anonymous or Google provider isn't enabled in the Firebase console
// (CONFIGURATION_NOT_FOUND). We DELIBERATELY surface that instead of swallowing
// it, so a misconfiguration is visible before any rules are tightened.

let lastAuthError: string | null = null;

export function getAuthError(): string | null {
  return lastAuthError;
}

function recordAuthError(e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e);
  lastAuthError = msg;
  const hint = /configuration_not_found|operation-not-allowed/i.test(msg)
    ? " → Enable Authentication and the Google + Anonymous providers in the Firebase console (Build → Authentication → Sign-in method)."
    : "";
  console.error(`[KidsCorner] Firebase auth failed: ${msg}${hint}`);
}

// --- Baseline (anonymous) auth for the shared kids' device -----------------

let authPromise: Promise<void> | null = null;

/**
 * Ensure we have SOME authenticated session so security rules can require
 * `auth != null`. If a session is already restored (e.g. a parent's Google
 * sign-in), we keep it; otherwise we sign in anonymously as the baseline for a
 * shared/kids' device. Never hangs the app — records and surfaces failures.
 */
export function ensureAuth(): Promise<void> {
  if (!FIREBASE_READY) return Promise.resolve();
  if (authPromise) return authPromise;
  const auth = getAuthInstance();
  if (!auth) return Promise.resolve();

  authPromise = (async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      /* non-fatal — fall back to default persistence */
    }
    // Complete a pending redirect sign-in, if any (Google popup fallback).
    try {
      await getRedirectResult(auth);
    } catch (e) {
      recordAuthError(e);
    }
    await new Promise<void>((resolve) => {
      let triedAnon = false;
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      onAuthStateChanged(auth, (user) => {
        if (user) {
          finish();
          return;
        }
        if (!triedAnon) {
          triedAnon = true;
          signInAnonymously(auth).catch((e) => {
            recordAuthError(e);
            finish(); // surface the error but don't block the app
          });
        }
      });
    });
  })();
  return authPromise;
}

// --- Grown-up (Google SSO) identity ----------------------------------------

/**
 * Sign a grown-up in with Google via a full-page REDIRECT (not a popup).
 * Popups are unreliable here: on GitHub Pages / strict popup-blockers /
 * mobile, signInWithPopup can be silently blocked and then HANG forever on the
 * cross-origin handshake (the "Opening Google…" that never opens). A redirect
 * navigates away cleanly; the result is completed by ensureAuth's
 * getRedirectResult when we return.
 */
export async function signInWithGoogle(): Promise<User | null> {
  const auth = getAuthInstance();
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch {
    /* non-fatal */
  }
  await signInWithRedirect(auth, provider); // navigates away
  return null;
}

export async function signOutUser(): Promise<void> {
  const auth = getAuthInstance();
  if (auth) await signOut(auth);
}

/** Subscribe to auth-state changes. Returns an unsubscribe fn. */
export function onAuthChange(cb: (user: User | null) => void): () => void {
  const auth = getAuthInstance();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export function currentUser(): User | null {
  return getAuthInstance()?.currentUser ?? null;
}
