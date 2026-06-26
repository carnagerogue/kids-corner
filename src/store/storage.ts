import type {
  ActivityIdea,
  Announcement,
  AppState,
  AvatarConfig,
  ChoreAssignment,
  FamilyGoal,
  Loadout3D,
  Reaction,
  Kid,
  KidId,
  KidState,
  Message,
  SavedLoadout3D,
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
    customActivities: [],
    activityImages: {},
    coinsSpent: {},
    coinsBonus: {},
    lastSpin: {},
    ownedGear: {},
    avatar: {},
    avatar3d: {},
    loadouts3d: {},
    purchasesLocked: {},
    themes,
    messages: [],
    announcements: [],
    reactions: [],
    familyGoal: null,
    appVisibility,
    exploreHidden,
  };
}

/** How many approved photos to keep for the grown-up's per-kid gallery. */
const MAX_GALLERY_PHOTOS = 48;

/**
 * Photos are heavy. Keep every pending photo (awaiting review) and the most
 * recent approved photos (the grown-up's finished-task gallery); drop the image
 * data from everything else so localStorage doesn't fill up. `cap` shrinks the
 * gallery under storage pressure.
 */
function prunePhotos(
  submissions: Submission[],
  cap: number = MAX_GALLERY_PHOTOS,
): Submission[] {
  const trimmed = submissions.slice(-MAX_SUBMISSIONS);
  const keep = new Set(
    trimmed
      .filter((s) => s.status === "approved" && s.photo)
      .sort(
        (a, b) =>
          (b.reviewedAt ?? b.submittedAt) - (a.reviewedAt ?? a.submittedAt),
      )
      .slice(0, cap)
      .map((s) => s.id),
  );
  return trimmed.map((s) => {
    if (s.status === "pending") return s;
    if (s.status === "approved" && keep.has(s.id)) return s;
    return s.photo ? { ...s, photo: "" } : s;
  });
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
    const coinsSpent: Record<KidId, number> = {};
    const coinsBonus: Record<KidId, number> = {};
    const lastSpin: Record<KidId, string> = {};
    const ownedGear: Record<KidId, string[]> = {};
    const avatar: Record<KidId, AvatarConfig> = {};
    const avatar3d: Record<KidId, Loadout3D> = {};
    const loadouts3d: Record<KidId, SavedLoadout3D[]> = {};
    const purchasesLocked: Record<KidId, boolean> = {};
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

      const spent = (parsed.coinsSpent as Record<string, unknown> | undefined)?.[
        id
      ];
      coinsSpent[id] = typeof spent === "number" && spent >= 0 ? spent : 0;

      const bonus = (parsed.coinsBonus as Record<string, unknown> | undefined)?.[
        id
      ];
      coinsBonus[id] = typeof bonus === "number" && bonus >= 0 ? bonus : 0;

      const ls = (parsed.lastSpin as Record<string, unknown> | undefined)?.[id];
      lastSpin[id] = typeof ls === "string" ? ls : "";

      const owned = (parsed.ownedGear as Record<string, unknown> | undefined)?.[id];
      ownedGear[id] = Array.isArray(owned)
        ? (owned as unknown[]).filter((x): x is string => typeof x === "string")
        : [];

      const av = (parsed.avatar as Record<string, unknown> | undefined)?.[id];
      avatar[id] =
        av && typeof av === "object" ? (av as AvatarConfig) : {};

      const av3 = (parsed.avatar3d as Record<string, unknown> | undefined)?.[id];
      avatar3d[id] =
        av3 && typeof av3 === "object" ? (av3 as Loadout3D) : {};

      const lo3 = (parsed.loadouts3d as Record<string, unknown> | undefined)?.[id];
      loadouts3d[id] = Array.isArray(lo3)
        ? (lo3 as unknown[]).filter(
            (l): l is SavedLoadout3D =>
              !!l &&
              typeof (l as SavedLoadout3D).id === "string" &&
              typeof (l as SavedLoadout3D).name === "string" &&
              typeof (l as SavedLoadout3D).loadout === "object",
          )
        : [];

      const pl = (parsed.purchasesLocked as Record<string, unknown> | undefined)?.[
        id
      ];
      purchasesLocked[id] = pl === true;
    }

    const submissions = Array.isArray(parsed.submissions)
      ? prunePhotos(parsed.submissions as Submission[])
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

    const announcements = Array.isArray(parsed.announcements)
      ? (parsed.announcements as Announcement[])
          .filter(
            (a) => a && typeof a.id === "string" && typeof a.at === "number",
          )
          .slice(-50)
      : [];

    const reactions = Array.isArray(parsed.reactions)
      ? (parsed.reactions as Reaction[])
          .filter(
            (r) =>
              r &&
              typeof r.id === "string" &&
              typeof r.submissionId === "string",
          )
          .slice(-500)
      : [];

    const fg = parsed.familyGoal as FamilyGoal | null | undefined;
    const familyGoal =
      fg && typeof fg.target === "number" && typeof fg.since === "string"
        ? { target: fg.target, reward: fg.reward ?? "", since: fg.since }
        : null;

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
      customActivities: Array.isArray(parsed.customActivities)
        ? (parsed.customActivities as ActivityIdea[]).filter(
            (a) => a && typeof a.id === "string" && typeof a.title === "string",
          )
        : [],
      activityImages:
        parsed.activityImages && typeof parsed.activityImages === "object"
          ? (parsed.activityImages as Record<string, string>)
          : {},
      coinsSpent,
      coinsBonus,
      lastSpin,
      ownedGear,
      avatar,
      avatar3d,
      loadouts3d,
      purchasesLocked,
      themes,
      messages,
      announcements,
      reactions,
      familyGoal,
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
    // Storage might be full (lots of photos) — shrink the photo gallery to the
    // most recent few and retry.
    try {
      const slimmed: AppState = {
        ...state,
        submissions: prunePhotos(state.submissions, 12),
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
