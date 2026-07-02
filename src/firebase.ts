import { initializeApp, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithPopup,
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
  const raw = e instanceof Error ? e.message : String(e);
  const code = (e as { code?: string })?.code ?? "";
  const msg = /popup-blocked/i.test(code)
    ? "Your browser blocked the Google sign-in window. Allow pop-ups for Luminara, then try again."
    : /operation-not-supported-in-this-environment|web-storage-unsupported/i.test(code)
      ? "Google sign-in is unavailable in this browser window. Open Luminara in Safari, Chrome, or Edge and try again."
      : raw;
  lastAuthError = msg;
  const hint = /configuration_not_found|operation-not-allowed/i.test(raw)
    ? " → Enable Authentication and the Google + Anonymous providers in the Firebase console (Build → Authentication → Sign-in method)."
    : "";
  console.error(`[KidsCorner] Firebase auth failed: ${raw}${hint}`);
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
 * Sign a grown-up in with Google. Open the popup immediately from the user's
 * click: awaiting persistence here can consume the browser's transient user
 * activation and cause the popup to be blocked. Persistence is already set by
 * ensureAuth during app startup.
 *
 * This intentionally stays popup-only. Firebase's redirect helper is on a
 * different origin from the primary web.app site, so modern storage
 * partitioning can discard its temporary state and strand the user on
 * /__/auth/handler. A blocked popup is surfaced with a useful recovery message
 * instead of silently falling into that broken redirect path.
 */
export async function signInWithGoogle(): Promise<User | null> {
  const auth = getAuthInstance();
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  lastAuthError = null;
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (e) {
    const code = (e as { code?: string })?.code ?? "";
    // User closed/cancelled the popup themselves — not an error, just stop.
    if (/popup-closed-by-user|cancelled-popup-request|user-cancelled/i.test(code)) {
      return null;
    }
    // Do not redirect as a fallback: this app is also served from web.app and
    // GitHub Pages, where the cross-origin helper can lose its initial state.
    if (/popup-blocked|operation-not-supported-in-this-environment|web-storage-unsupported/i.test(code)) {
      recordAuthError(e);
      throw e;
    }
    // A real failure (unauthorized domain, provider disabled, network) — record
    // it so GrownUpGate can show the reason instead of silently looping.
    recordAuthError(e);
    throw e;
  }
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
