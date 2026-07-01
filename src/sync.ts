// Cross-device sync room. By DEFAULT every device joins one shared family room,
// so the app "just works" from any computer with zero setup. A grown-up can
// optionally set a private code (same on each device) to use a separate room.
//
// IMPORTANT: DEFAULT_SYNC_CODE is a fixed, public string — anyone who clones
// this repo or reads the deployed bundle knows it. It's fine for trying the
// app out, but real family data should move to a private code (see
// migrateRoom below) generated with generatePrivateCode, never left on the
// default room long-term.
import { get, ref, set, update } from "firebase/database";
import { currentUser, ensureAuth, FIREBASE_READY, getDb } from "./firebase";

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

// --- Device pairing --------------------------------------------------------
// A kids' shared tablet doesn't sign in with Google; it BINDS to exactly one
// family via a short-lived setup code a grown-up generates from their
// dashboard. This is the boundary that keeps a stranger (or a kid from another
// family) from ever reaching a screen that shows the family's children — an
// unbound device is shown a "connect this device" prompt, never a roster.
//
// A pairing lives at pairings/{code} = { fid, createdBy, createdAt, expiresAt }.
// The code carries ~50 bits of entropy and expires fast, so it can't be guessed
// within its window. It stays a bearer secret until Phase 2 (a Cloud Function)
// makes redemption strictly single-use — see database.rules.json.

/** How long a freshly generated pairing code stays valid. */
export const PAIRING_TTL_MS = 5 * 60 * 1000;

/**
 * A random 10-char setup code (~50 bits over the unambiguous alphabet), shown
 * grouped as "ABCDE-FGHIJ". Never numeric — it's a credential, not a PIN.
 */
export function generatePairingCode(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

/** Display form of a raw code: "ABCDEFGHIJ" -> "ABCDE-FGHIJ". */
export function formatPairingCode(code: string): string {
  return code.length === 10 ? `${code.slice(0, 5)}-${code.slice(5)}` : code;
}

/** Normalise typed input back to the raw key: uppercase, digits/letters only. */
export function normalizePairingCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export type PairingInfo = { code: string; expiresAt: number };

/**
 * Create a setup code bound to `familyId`. Requires the caller to be a signed-in
 * member of that family (enforced again by the rules). Returns the code + expiry
 * for the grown-up to read to the tablet.
 */
export async function createPairing(familyId: string): Promise<PairingInfo> {
  if (!FIREBASE_READY) throw new Error("Cloud sync isn't set up.");
  const db = getDb();
  if (!db) throw new Error("Cloud sync isn't set up.");
  await ensureAuth();
  const uid = currentUser()?.uid;
  if (!uid) throw new Error("Please sign in again, then retry.");
  const code = generatePairingCode();
  const now = Date.now();
  const expiresAt = now + PAIRING_TTL_MS;
  await set(ref(db, `pairings/${code}`), {
    fid: familyId,
    createdBy: uid,
    createdAt: now,
    expiresAt,
  });
  return { code, expiresAt };
}

/**
 * Redeem a typed setup code -> the family id it points to. Throws (uniform
 * "didn't work") on missing/expired, so the kid UI never distinguishes
 * wrong-vs-expired-vs-nonexistent. The caller enrolls the device as a member.
 */
export async function redeemPairing(rawCode: string): Promise<string> {
  if (!FIREBASE_READY) throw new Error("Cloud sync isn't set up.");
  const db = getDb();
  if (!db) throw new Error("Cloud sync isn't set up.");
  await ensureAuth();
  const code = normalizePairingCode(rawCode);
  if (code.length < 8) throw new Error("That code didn't work.");
  const snap = await get(ref(db, `pairings/${code}`));
  const val = snap.val() as { fid?: string; expiresAt?: number } | null;
  if (!val || typeof val.fid !== "string" || !val.fid) {
    throw new Error("That code didn't work.");
  }
  if (typeof val.expiresAt === "number" && val.expiresAt < Date.now()) {
    throw new Error("That code didn't work.");
  }
  return val.fid;
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

/**
 * Copy a legacy room's DATA (config + id-keyed maps) into families/{familyId}.
 * Deliberately NOT migrateRoom (that's rooms/->rooms/): this leaves the
 * family's own meta/members intact (preserving ownership), refuses if the
 * family already has data, and NEVER deletes or mutates the source room, so
 * the legacy room stays as a rollback.
 */
export async function copyRoomToFamily(
  fromRoomCode: string,
  familyId: string,
): Promise<MigrateResult> {
  if (!FIREBASE_READY) return { ok: false, error: "Cloud sync isn't set up." };
  const db = getDb();
  if (!db) return { ok: false, error: "Cloud sync isn't set up." };
  try {
    await ensureAuth();
    const fam = sanitizeCode(familyId);
    const existing = await get(ref(db, `families/${fam}/config`));
    if (existing.exists()) {
      return {
        ok: false,
        error: "This family already has data — import skipped so nothing is overwritten.",
      };
    }
    const src = await get(ref(db, `rooms/${sanitizeCode(fromRoomCode)}`));
    const data = src.val() as Record<string, unknown> | null;
    if (!data) return { ok: false, error: "No data found in the room to import." };

    // Copy only data nodes — never meta/members (ownership stays with the
    // family's creator), and never touch the source room.
    const NODES = [
      "config",
      "submissions",
      "choreAssignments",
      "messages",
      "announcements",
      "reactions",
    ];
    const updates: Record<string, unknown> = {};
    for (const node of NODES) {
      if (data[node] !== undefined) updates[`families/${fam}/${node}`] = data[node];
    }
    if (Object.keys(updates).length === 0) {
      return { ok: false, error: "The room had no data to import." };
    }
    await update(ref(db), updates);

    const config = data.config as { kidProfiles?: unknown[] } | undefined;
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
