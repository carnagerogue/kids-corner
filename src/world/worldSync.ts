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
  aura?: string | null; // equipped cosmetic aura id (so siblings see it)
  companion?: string | null; // equipped companion creature id
  t?: number; // last-update epoch ms
};

export type PlayerStats = {
  kidId: string;
  name: string;
  color: string;
  level: number;
  xp: number;
  badges: number;
  bossWins: number;
  streak: number;
  t?: number;
};

export type SharedWorldGame = {
  questId: "lost-stars-v1";
  stars: Record<string, { kidId: string; name: string; ts: number }>;
  landmarks: Partial<Record<LandmarkId, { kidId: string; name: string; ts: number }>>;
};

const STALE_MS = 15000;
const WRITE_INTERVAL_MS = 90;
const CHAT_TTL_MS = 12000; // a chat bubble stops showing this long after it was said

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
// The latest COMPLETE self record. Every write re-sends the whole thing via
// set(), so a heartbeat that lands right after a transient onDisconnect-remove
// can't resurrect a half-record (only {t}) that the kidId read-filter drops.
let selfState: PlayerState | null = null;

export function worldSyncEnabled(): boolean {
  return !!worldRootPath();
}

/** The active room code (empty when multiplayer is off). Lets callers re-join
 * when the family sync code changes mid-session. */
export function worldRoomCode(): string {
  return readSyncOverride();
}

export function joinWorld(initial: PlayerState): void {
  db = getDb();
  if (!db) return;
  const path = playersPath();
  if (!path) return;
  // Session suffix prevents two tabs/devices for one child from deleting or
  // overwriting each other's presence record.
  selfPath = `${path}/${sanitize(initial.kidId)}-${sessionId}`;
  selfState = { ...initial, t: Date.now() };
  const r = ref(db, selfPath);
  set(r, selfState);
  onDisconnect(r).remove();
}

/** Write self position/heading, throttled. Pass force for important changes. */
export function updateSelf(partial: Partial<PlayerState>, force = false): void {
  if (!db || !selfPath || !selfState) return;
  const now = Date.now();
  selfState = { ...selfState, ...partial, t: now };
  if (!force && now - lastWrite < WRITE_INTERVAL_MS) return;
  lastWrite = now;
  set(ref(db, selfPath), selfState);
}

export function sendChat(text: string): void {
  if (!db || !selfPath || !selfState) return;
  selfState = { ...selfState, chat: { text: text.slice(0, 120), ts: Date.now() } };
  set(ref(db, selfPath), selfState);
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
      Object.values(val)
        .filter((p) => p && p.kidId && (!p.t || now - p.t < STALE_MS))
        // Drop chat that's older than its display window so a late joiner (or a
        // reconnect) never re-pops a stale bubble that lingered in the DB.
        .map((p) =>
          p.chat && now - p.chat.ts > CHAT_TTL_MS ? { ...p, chat: null } : p,
        ),
    );
  });
}

export function leaveWorld(): void {
  if (db && selfPath) {
    const r = ref(db, selfPath);
    onDisconnect(r).cancel(); // don't leave an armed remove() on the connection
    remove(r);
  }
  selfPath = null;
  selfState = null;
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

// --- Co-op boss raid (date-keyed; each kid writes ONLY their own hit count,
// so concurrent raiders never race) ----------------------------------------
export type BossState = { hits: Record<string, number>; total: number };

export function subscribeBoss(
  dateStr: string,
  cb: (state: BossState) => void,
): () => void {
  db = getDb();
  const root = worldRootPath();
  if (!db || !root) {
    cb({ hits: {}, total: 0 });
    return () => {};
  }
  return onValue(
    ref(db, `${root}/boss/${sanitize(dateStr)}/hits`),
    (snap) => {
      const hits = (snap.val() || {}) as Record<string, number>;
      const total = Object.values(hits).reduce((sum, n) => sum + (n || 0), 0);
      cb({ hits, total });
    },
  );
}

export function recordBossHit(
  dateStr: string,
  kidId: string,
  hits: number,
): void {
  db = getDb();
  const root = worldRootPath();
  if (!db || !root) return;
  // Per-session key so two tabs/devices of the same child each contribute
  // (the raid sums all contributors) instead of clobbering one shared slot.
  set(
    ref(db, `${root}/boss/${sanitize(dateStr)}/hits/${sanitize(kidId)}-${sessionId}`),
    hits,
  );
}

// --- Family leaderboard (persistent per-kid stats, not presence) ------------
export function shareStats(stats: PlayerStats): void {
  db = getDb();
  const root = worldRootPath();
  if (!db || !root) return;
  set(ref(db, `${root}/stats/${sanitize(stats.kidId)}`), {
    ...stats,
    t: Date.now(),
  });
}

export function subscribeStats(cb: (rows: PlayerStats[]) => void): () => void {
  db = getDb();
  const root = worldRootPath();
  if (!db || !root) {
    cb([]);
    return () => {};
  }
  return onValue(ref(db, `${root}/stats`), (snap) => {
    const val = (snap.val() || {}) as Record<string, PlayerStats>;
    cb(Object.values(val).filter((s) => s && s.kidId));
  });
}
