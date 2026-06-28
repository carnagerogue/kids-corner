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
import { readSyncOverride } from "../sync";
import type { LandmarkId } from "./worldGame";

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

export type SharedWorldGame = {
  questId: "lost-stars-v1";
  stars: Record<string, { kidId: string; name: string; ts: number }>;
  landmarks: Partial<Record<LandmarkId, { kidId: string; name: string; ts: number }>>;
};

const STALE_MS = 15000;
const WRITE_INTERVAL_MS = 90;

function sanitize(s: string): string {
  return s.replace(/[.#$/[\]]/g, "_");
}
function worldRootPath(): string | null {
  // Multiplayer is intentionally opt-in. A public, source-visible default room
  // is not an acceptable boundary for child presence or chat.
  const code = readSyncOverride();
  return code ? `rooms/${sanitize(code)}/world` : null;
}
function playersPath(): string | null {
  const root = worldRootPath();
  return root ? `${root}/players` : null;
}

let db: Database | null = null;
let selfPath: string | null = null;
let lastWrite = 0;
const sessionId = Math.random().toString(36).slice(2, 10);

export function worldSyncEnabled(): boolean {
  return !!worldRootPath();
}

export function joinWorld(initial: PlayerState): void {
  db = getDb();
  if (!db) return;
  const path = playersPath();
  if (!path) return;
  // Session suffix prevents two tabs/devices for one child from deleting or
  // overwriting each other's presence record.
  selfPath = `${path}/${sanitize(initial.kidId)}-${sessionId}`;
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
  const path = playersPath();
  if (!db || !path) {
    cb([]);
    return () => {};
  }
  const r = ref(db, path);
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

export function subscribeWorldGame(
  cb: (game: SharedWorldGame | null) => void,
): () => void {
  db = getDb();
  const root = worldRootPath();
  if (!db || !root) {
    cb(null);
    return () => {};
  }
  return onValue(ref(db, `${root}/game/lost-stars-v1`), (snap) => {
    const value = snap.val() as Partial<SharedWorldGame> | null;
    cb(
      value
        ? {
            questId: "lost-stars-v1",
            stars: value.stars ?? {},
            landmarks: value.landmarks ?? {},
          }
        : { questId: "lost-stars-v1", stars: {}, landmarks: {} },
    );
  });
}

export function shareCollectedStar(
  starId: string,
  kid: { kidId: string; name: string },
): void {
  db = getDb();
  const root = worldRootPath();
  if (!db || !root) return;
  set(ref(db, `${root}/game/lost-stars-v1/stars/${sanitize(starId)}`), {
    kidId: kid.kidId,
    name: kid.name,
    ts: Date.now(),
  });
}

export function shareActivatedLandmark(
  landmarkId: LandmarkId,
  kid: { kidId: string; name: string },
): void {
  db = getDb();
  const root = worldRootPath();
  if (!db || !root) return;
  set(
    ref(
      db,
      `${root}/game/lost-stars-v1/landmarks/${sanitize(landmarkId)}`,
    ),
    { kidId: kid.kidId, name: kid.name, ts: Date.now() },
  );
}
