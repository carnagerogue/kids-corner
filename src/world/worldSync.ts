// ---------------------------------------------------------------------------
// worldSync — low-latency presence + chat for the multiplayer World.
//
// Deliberately SEPARATE from FamilySync (which pushes on every app-state change,
// far too slow for movement). Players live under `world/{roomCode}/players/{kid}`
// — a sibling of `rooms/{code}` so position spam never touches the config blob.
// Self position writes are throttled (~10/s); `onDisconnect().remove()` cleans a
// player up when their tab closes. Stale players (no update for STALE_MS) are
// filtered out on read in case a disconnect handler didn't fire.
// ---------------------------------------------------------------------------
import {
  ref,
  set,
  update,
  onValue,
  onDisconnect,
  remove,
  type Database,
} from "firebase/database";
import { getDb } from "../firebase";
import { readSyncCode } from "../sync";

export type PlayerState = {
  kidId: string;
  name: string;
  color: string;
  modelUrl: string;
  x: number;
  z: number;
  heading: number;
  moving?: boolean;
  chat?: { text: string; ts: number } | null;
  t?: number; // last-update epoch ms
};

const STALE_MS = 15000;
const WRITE_INTERVAL_MS = 90;

function sanitize(s: string): string {
  return s.replace(/[.#$/[\]]/g, "_");
}
function playersPath(): string {
  // Under rooms/{code} because the RTDB rules only permit the `rooms/` subtree.
  return `rooms/${sanitize(readSyncCode())}/world/players`;
}

let db: Database | null = null;
let selfPath: string | null = null;
let lastWrite = 0;

export function joinWorld(initial: PlayerState): void {
  db = getDb();
  if (!db) return;
  selfPath = `${playersPath()}/${sanitize(initial.kidId)}`;
  const r = ref(db, selfPath);
  set(r, { ...initial, t: Date.now() });
  onDisconnect(r).remove();
}

/** Write self position/heading, throttled. Pass force for important changes. */
export function updateSelf(partial: Partial<PlayerState>, force = false): void {
  if (!db || !selfPath) return;
  const now = Date.now();
  if (!force && now - lastWrite < WRITE_INTERVAL_MS) return;
  lastWrite = now;
  update(ref(db, selfPath), { ...partial, t: now });
}

export function sendChat(text: string): void {
  if (!db || !selfPath) return;
  update(ref(db, selfPath), { chat: { text: text.slice(0, 120), ts: Date.now() } });
}

/** Subscribe to all players. Returns an unsubscribe fn. Filters stale entries. */
export function subscribeWorld(
  cb: (players: PlayerState[]) => void,
): () => void {
  db = getDb();
  if (!db) {
    cb([]);
    return () => {};
  }
  const r = ref(db, playersPath());
  return onValue(r, (snap) => {
    const val = (snap.val() || {}) as Record<string, PlayerState>;
    const now = Date.now();
    cb(
      Object.values(val).filter(
        (p) => p && p.kidId && (!p.t || now - p.t < STALE_MS),
      ),
    );
  });
}

export function leaveWorld(): void {
  if (db && selfPath) remove(ref(db, selfPath));
  selfPath = null;
}
