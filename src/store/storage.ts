import type {
  AppState,
  ChoreAssignment,
  Kid,
  KidId,
  KidState,
  Message,
  ScheduleBlock,
  SchedulePlan,
  Submission,
  ThemeId,
} from "../types";
import {
  DEFAULT_KIDS,
  DEFAULT_KID_PINS,
  DEFAULT_KID_THEMES,
} from "../data/kids";
import { DEFAULT_NEW_KID_APPS, DEFAULT_VISIBLE_APPS } from "../data/applications";
import { THEME_BY_ID } from "../data/themes";
import { FAMILY_PLAN_ID, defaultSchedules } from "../data/schedule";

export const STORAGE_KEY = "kids-corner:v2";
const STATE_VERSION = 2;

/** Keep at most this many messages to bound storage growth. */
const MAX_MESSAGES = 300;

/** Default grown-up PIN. Change it in the Grown-Ups area. */
export const DEFAULT_PARENT_PIN = "1234";

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

/** Default visible apps for a kid id (seeded kids get their set; others basic). */
export function defaultVisibility(id: KidId): string[] {
  return [...(DEFAULT_VISIBLE_APPS[id] ?? DEFAULT_NEW_KID_APPS)];
}

/** Coerce one stored block, dropping it if the essential fields are missing. */
function loadBlock(raw: unknown): ScheduleBlock | null {
  const b = raw as Record<string, unknown>;
  if (
    !b ||
    typeof b.id !== "string" ||
    typeof b.title !== "string" ||
    typeof b.startMinutes !== "number" ||
    typeof b.endMinutes !== "number"
  ) {
    return null;
  }
  return {
    id: b.id,
    title: b.title,
    time: typeof b.time === "string" ? b.time : "",
    startMinutes: b.startMinutes,
    endMinutes: b.endMinutes,
    emoji: typeof b.emoji === "string" ? b.emoji : "🗓️",
    accent: typeof b.accent === "string" ? b.accent : "#3b82f6",
    xp: typeof b.xp === "number" ? b.xp : 10,
    // Only include the optional keys when present (avoid `undefined`, which
    // Firebase rejects when this block is later synced).
    ...(typeof b.note === "string" ? { note: b.note } : {}),
    ...(b.opensApplications === true ? { opensApplications: true } : {}),
  };
}

/**
 * Load saved schedule plans defensively: validate shapes, restrict kid
 * assignments to the current roster, and guarantee exactly one family plan.
 */
export function loadSchedules(raw: unknown, ids: KidId[]): SchedulePlan[] {
  if (!Array.isArray(raw)) return defaultSchedules();
  const idSet = new Set(ids);
  const plans: SchedulePlan[] = [];
  for (const item of raw as unknown[]) {
    const p = item as Record<string, unknown>;
    if (!p || typeof p.id !== "string" || !Array.isArray(p.blocks)) continue;
    const blocks = (p.blocks as unknown[])
      .map(loadBlock)
      .filter((b): b is ScheduleBlock => b !== null);
    const scope = p.scope as Record<string, unknown> | undefined;
    if (p.id === FAMILY_PLAN_ID || scope?.kind === "family") {
      plans.push({
        id: FAMILY_PLAN_ID,
        name: typeof p.name === "string" ? p.name : "Everyone",
        scope: { kind: "family" },
        blocks,
      });
    } else if (scope?.kind === "kids") {
      const kidIds = Array.isArray(scope.kidIds)
        ? (scope.kidIds as unknown[]).filter(
            (x): x is string => typeof x === "string" && idSet.has(x),
          )
        : [];
      plans.push({
        id: p.id,
        name: typeof p.name === "string" ? p.name : "Schedule",
        scope: { kind: "kids", kidIds },
        blocks,
      });
    }
  }
  // Guarantee a single family plan (seed one if the saved data lacked it).
  if (!plans.some((p) => p.scope.kind === "family")) {
    plans.unshift(defaultSchedules()[0]);
  }
  return plans;
}

/** Accept new-format messages; convert old kid↔parent ones; drop junk. */
function migrateMessage(raw: unknown): Message | null {
  const m = raw as Record<string, unknown>;
  if (!m || typeof m.id !== "string" || typeof m.text !== "string") return null;
  const photo = typeof m.photo === "string" ? { photo: m.photo } : {};
  if (typeof m.from === "string" && typeof m.to === "string") {
    return {
      id: m.id,
      from: m.from,
      to: m.to,
      text: m.text,
      at: typeof m.at === "number" ? m.at : 0,
      read: !!m.read,
      ...photo,
    };
  }
  // Old shape: { kidId, from: "kid"|"parent", readByKid, readByParent }
  if (typeof m.kidId === "string" && typeof m.from === "string") {
    const fromKid = m.from === "kid";
    return {
      id: m.id,
      from: fromKid ? (m.kidId as string) : "parent",
      to: fromKid ? "parent" : (m.kidId as string),
      text: m.text,
      at: typeof m.at === "number" ? m.at : 0,
      read: fromKid ? !!m.readByParent : !!m.readByKid,
      ...photo,
    };
  }
  return null;
}

export function defaultState(): AppState {
  const kids: Record<KidId, KidState> = {};
  const kidPins: Record<KidId, string> = {};
  const themes: Record<KidId, ThemeId> = {};
  const appVisibility: Record<KidId, string[]> = {};
  const exploreHidden: Record<KidId, string[]> = {};
  for (const k of DEFAULT_KIDS) {
    kids[k.id] = emptyKidState();
    kidPins[k.id] = DEFAULT_KID_PINS[k.id] ?? "0000";
    themes[k.id] = DEFAULT_KID_THEMES[k.id] ?? "sparkle";
    appVisibility[k.id] = defaultVisibility(k.id);
    exploreHidden[k.id] = [];
  }
  return {
    version: STATE_VERSION,
    kidProfiles: DEFAULT_KIDS.map((k) => ({ ...k })),
    removedKids: [],
    activeKid: DEFAULT_KIDS[0].id,
    parentPin: DEFAULT_PARENT_PIN,
    kidPins,
    kids,
    submissions: [],
    choreAssignments: [],
    schedules: defaultSchedules(),
    themes,
    messages: [],
    appVisibility,
    exploreHidden,
  };
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

    // The roster: use saved profiles if present & valid, else the defaults.
    const profiles: Kid[] =
      Array.isArray(parsed.kidProfiles) && parsed.kidProfiles.length
        ? (parsed.kidProfiles as Kid[]).filter(
            (k) =>
              k && typeof k.id === "string" && typeof k.firstName === "string",
          )
        : DEFAULT_KIDS.map((k) => ({ ...k }));
    const ids = profiles.map((p) => p.id);

    const base = defaultState();
    const kids: Record<KidId, KidState> = {};
    const kidPins: Record<KidId, string> = {};
    const themes: Record<KidId, ThemeId> = {};
    const appVisibility: Record<KidId, string[]> = {};
    const exploreHidden: Record<KidId, string[]> = {};
    for (const id of ids) {
      const k = parsed.kids?.[id];
      kids[id] = k
        ? {
            badges: Array.isArray(k.badges) ? k.badges : [],
            history: k.history && typeof k.history === "object" ? k.history : {},
          }
        : emptyKidState();

      const p = (parsed.kidPins as Record<string, unknown> | undefined)?.[id];
      kidPins[id] =
        typeof p === "string" && p.length > 0
          ? p
          : DEFAULT_KID_PINS[id] ?? "0000";

      const t = (parsed.themes as Record<string, unknown> | undefined)?.[id];
      themes[id] =
        typeof t === "string" && t in THEME_BY_ID
          ? (t as ThemeId)
          : DEFAULT_KID_THEMES[id] ?? "sparkle";

      const vis = (parsed.appVisibility as Record<string, unknown> | undefined)?.[
        id
      ];
      appVisibility[id] = Array.isArray(vis)
        ? (vis as unknown[]).filter((x): x is string => typeof x === "string")
        : defaultVisibility(id);

      const hid = (parsed.exploreHidden as Record<string, unknown> | undefined)?.[
        id
      ];
      exploreHidden[id] = Array.isArray(hid)
        ? (hid as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
    }

    const submissions = Array.isArray(parsed.submissions)
      ? prunePhotos(parsed.submissions as Submission[], todayKey())
      : [];

    const today = todayKey();
    const choreAssignments = Array.isArray(parsed.choreAssignments)
      ? (parsed.choreAssignments as ChoreAssignment[]).filter(
          (c) => c && typeof c.date === "string" && c.date >= today,
        )
      : [];

    const messages = Array.isArray(parsed.messages)
      ? (parsed.messages as unknown[])
          .map(migrateMessage)
          .filter((m): m is Message => m !== null)
          .slice(-MAX_MESSAGES)
      : [];

    const activeKid =
      typeof parsed.activeKid === "string" && ids.includes(parsed.activeKid)
        ? parsed.activeKid
        : ids[0] ?? base.activeKid;

    const removedKids = Array.isArray(parsed.removedKids)
      ? (parsed.removedKids as unknown[]).filter(
          (x): x is string => typeof x === "string",
        )
      : [];

    return {
      version: STATE_VERSION,
      kidProfiles: profiles,
      removedKids,
      activeKid,
      parentPin:
        typeof parsed.parentPin === "string" && parsed.parentPin.length > 0
          ? parsed.parentPin
          : DEFAULT_PARENT_PIN,
      kidPins,
      kids,
      submissions,
      choreAssignments,
      schedules: loadSchedules(parsed.schedules, ids),
      themes,
      messages,
      appVisibility,
      exploreHidden,
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    const serialized = JSON.stringify(state);
    // Skip no-op writes so cross-tab sync (storage events) can't ping-pong.
    if (localStorage.getItem(STORAGE_KEY) === serialized) return;
    localStorage.setItem(STORAGE_KEY, serialized);
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
    return v && v.length > 0 ? v : null;
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
