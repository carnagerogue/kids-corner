// Cross-device sync room. By DEFAULT every device joins one shared family room,
// so the app "just works" from any computer with zero setup. A grown-up can
// optionally set a private code (same on each device) to use a separate room.
//
// IMPORTANT: DEFAULT_SYNC_CODE is a fixed, public string — anyone who clones
// this repo or reads the deployed bundle knows it. It's fine for trying the
// app out, but real family data should move to a private code (see
// migrateRoom below) generated with generatePrivateCode, never left on the
// default room long-term.
import { get, ref, set } from "firebase/database";
import { ensureAuth, FIREBASE_READY, getDb } from "./firebase";

const SYNC_KEY = "kids-corner:syncCode";
export const SYNC_EVENT = "kids-corner:synccode";

/** The shared room used when no private code is set. */
export const DEFAULT_SYNC_CODE = "kids-corner-family";

/** Firebase keys can't contain . # $ / [ ] — matches FamilySync's `safe()`. */
function sanitizeCode(code: string): string {
  return code.replace(/[.#$/[\]]/g, "_");
}

// Unambiguous alphabet — no 0/O, 1/I/L confusion when read aloud or copied.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** A random, human-shareable private room code, e.g. "X7K4-9MQR-2VBN". */
export function generatePrivateCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)]
    .map((g) => g.join(""))
    .join("-");
}

export type MigrateResult =
  | { ok: true; counts: { kids: number; messages: number; submissions: number } }
  | { ok: false; error: string };

/**
 * One-time, explicit copy of everything under `rooms/{fromCode}` to
 * `rooms/{toCode}` — read-then-write, never deletes the source room, and
 * refuses to overwrite a destination that already has data. Call this BEFORE
 * switching this device's sync code, so the new room isn't empty when the
 * app starts reading from it.
 */
export async function migrateRoom(
  fromCode: string,
  toCode: string,
): Promise<MigrateResult> {
  if (!FIREBASE_READY) return { ok: false, error: "Cloud sync isn't set up." };
  const db = getDb();
  if (!db) return { ok: false, error: "Cloud sync isn't set up." };
  try {
    await ensureAuth();
    const fromRef = ref(db, `rooms/${sanitizeCode(fromCode)}`);
    const snap = await get(fromRef);
    const data = snap.val() as Record<string, unknown> | null;
    if (!data) {
      return { ok: false, error: "No data found in the current room." };
    }
    const toRef = ref(db, `rooms/${sanitizeCode(toCode)}`);
    const existing = await get(toRef);
    if (existing.exists()) {
      return {
        ok: false,
        error: "That code is already in use — try a different one.",
      };
    }
    await set(toRef, data);
    const config = data.config as
      | { kidProfiles?: unknown[] }
      | undefined;
    const counts = {
      kids: Array.isArray(config?.kidProfiles) ? config.kidProfiles.length : 0,
      messages: Object.keys((data.messages as object) ?? {}).length,
      submissions: Object.keys((data.submissions as object) ?? {}).length,
    };
    return { ok: true, counts };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** The room this device syncs to (the custom code, else the shared default). */
export function readSyncCode(): string {
  try {
    return localStorage.getItem(SYNC_KEY) || DEFAULT_SYNC_CODE;
  } catch {
    return DEFAULT_SYNC_CODE;
  }
}

/** The grown-up's custom code, or "" when using the shared default room. */
export function readSyncOverride(): string {
  try {
    return localStorage.getItem(SYNC_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeSyncCode(code: string): void {
  try {
    const c = code.trim();
    if (c) localStorage.setItem(SYNC_KEY, c);
    else localStorage.removeItem(SYNC_KEY);
    window.dispatchEvent(new Event(SYNC_EVENT));
  } catch {
    /* ignore */
  }
}
