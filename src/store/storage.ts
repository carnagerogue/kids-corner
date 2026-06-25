import type {
  AppState,
  ChoreAssignment,
  KidId,
  KidState,
  Submission,
} from "../types";
import { KID_ORDER } from "../data/kids";

const STORAGE_KEY = "kids-corner:v2";
const STATE_VERSION = 2;

/** Default grown-up PIN. Change it in the Grown-Ups area. */
export const DEFAULT_PARENT_PIN = "1234";

/** Default per-kid login PINs. Parents should change these in Grown-Ups. */
export const DEFAULT_KID_PINS: Record<KidId, string> = {
  claire: "1111",
  coby: "2222",
  hailee: "3333",
};

const SESSION_KEY = "kids-corner:session";

/** Keep at most this many submissions to bound storage growth. */
const MAX_SUBMISSIONS = 240;

export function todayKey(d: Date = new Date()): string {
  // Local-date key (YYYY-MM-DD), not UTC, so "today" matches the wall clock.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function emptyKidState(): KidState {
  return { badges: [], history: {} };
}

export function defaultState(): AppState {
  return {
    version: STATE_VERSION,
    activeKid: "claire",
    parentPin: DEFAULT_PARENT_PIN,
    kidPins: { ...DEFAULT_KID_PINS },
    kids: {
      claire: emptyKidState(),
      coby: emptyKidState(),
      hailee: emptyKidState(),
    },
    submissions: [],
    choreAssignments: [],
  };
}

function isKidId(value: unknown): value is KidId {
  return typeof value === "string" && (KID_ORDER as string[]).includes(value);
}

/**
 * Photos are heavy. Once a submission is reviewed AND it's from a previous day,
 * drop the image data (keep the record) so localStorage doesn't fill up.
 */
function prunePhotos(submissions: Submission[], today: string): Submission[] {
  const trimmed = submissions.slice(-MAX_SUBMISSIONS);
  return trimmed.map((s) =>
    s.status !== "pending" && s.date < today && s.photo
      ? { ...s, photo: "" }
      : s,
  );
}

/** Defensive load: tolerate missing keys without crashing; reset on version change. */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (parsed.version !== STATE_VERSION) return defaultState();

    const base = defaultState();
    const kids = { ...base.kids };
    for (const id of KID_ORDER) {
      const k = parsed.kids?.[id];
      if (k) {
        kids[id] = {
          badges: Array.isArray(k.badges) ? k.badges : [],
          history: k.history && typeof k.history === "object" ? k.history : {},
        };
      }
    }

    const submissions = Array.isArray(parsed.submissions)
      ? prunePhotos(parsed.submissions as Submission[], todayKey())
      : [];

    // Keep only today's (and future) chore assignments — stale ones expire.
    const today = todayKey();
    const choreAssignments = Array.isArray(parsed.choreAssignments)
      ? (parsed.choreAssignments as ChoreAssignment[]).filter(
          (c) => c && typeof c.date === "string" && c.date >= today,
        )
      : [];

    const kidPins = { ...DEFAULT_KID_PINS };
    if (parsed.kidPins && typeof parsed.kidPins === "object") {
      for (const id of KID_ORDER) {
        const p = (parsed.kidPins as Record<string, unknown>)[id];
        if (typeof p === "string" && p.length > 0) kidPins[id] = p;
      }
    }

    return {
      version: STATE_VERSION,
      activeKid: isKidId(parsed.activeKid) ? parsed.activeKid : "claire",
      parentPin:
        typeof parsed.parentPin === "string" && parsed.parentPin.length > 0
          ? parsed.parentPin
          : DEFAULT_PARENT_PIN,
      kidPins,
      kids,
      submissions,
      choreAssignments,
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage might be full (lots of photos) — drop reviewed photos and retry.
    try {
      const slimmed: AppState = {
        ...state,
        submissions: state.submissions.map((s) =>
          s.status !== "pending" ? { ...s, photo: "" } : s,
        ),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slimmed));
    } catch {
      // Give up quietly (e.g. private mode).
    }
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

// --- Login session --------------------------------------------------------
// Who's currently logged in. Kept in sessionStorage so it survives a reload
// but clears when the browser/tab closes (so the next kid must log in).

export function readSession(): KidId | null {
  try {
    const v = sessionStorage.getItem(SESSION_KEY);
    return isKidId(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeSession(kidId: KidId | null): void {
  try {
    if (kidId) sessionStorage.setItem(SESSION_KEY, kidId);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
