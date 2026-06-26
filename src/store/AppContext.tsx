import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  ActivityIdea,
  AppState,
  AvatarConfig,
  ChoreAssignment,
  GearSlot,
  Kid,
  KidId,
  Message,
  ParticipantId,
  SchedulePlan,
  ScheduleScope,
  Submission,
  SubmissionKind,
  ThemeId,
} from "../types";

/** The shared "family setup" that syncs across devices (not per-device state). */
export type SyncConfig = {
  kidProfiles: Kid[];
  removedKids: string[];
  kidPins: Record<string, string>;
  themes: Record<string, ThemeId>;
  appVisibility: Record<string, string[]>;
  exploreHidden: Record<string, string[]>;
  schedules: SchedulePlan[];
  customActivities: ActivityIdea[];
  activityImages: Record<string, string>;
  coinsSpent: Record<string, number>;
  ownedGear: Record<string, string[]>;
  avatar: Record<string, AvatarConfig>;
  parentPin: string;
};
import {
  defaultState,
  emptyKidState,
  loadState,
  newId,
  saveState,
  STORAGE_KEY,
  todayKey,
} from "./storage";
import { FAMILY_PLAN_ID, defaultSchedules } from "../data/schedule";
import { coinBalance, computeStats, getKidXp, ownsGear } from "./selectors";
import { BADGES } from "../data/badges";
import { GEAR_BY_ID } from "../data/avatar";
import { getLevelInfo } from "../data/levels";
import { makeKid } from "../data/kids";
import { DEFAULT_NEW_KID_APPS } from "../data/applications";

/** Return a copy of `obj` without `key`, preserving the value type. */
function omitKey<V>(obj: Record<string, V>, key: string): Record<string, V> {
  const rest: Record<string, V> = {};
  for (const k of Object.keys(obj)) if (k !== key) rest[k] = obj[k];
  return rest;
}

export type Action =
  | { type: "SET_ACTIVE_KID"; kidId: KidId }
  | { type: "TOGGLE_SCHEDULE"; kidId: KidId; blockId: string }
  | { type: "COMPLETE_SCHEDULE"; kidId: KidId; blockIds: string[] }
  | {
      type: "SUBMIT_TASK";
      kidId: KidId;
      kind: SubmissionKind;
      refId: string;
      title: string;
      emoji: string;
      xp: number;
      photo: string;
      /** If set, the mission was done together — both kids get a submission. */
      partnerId?: KidId;
    }
  | {
      type: "REVIEW_SUBMISSION";
      submissionId: string;
      decision: "approved" | "rejected";
      note?: string;
    }
  | { type: "SET_PARENT_PIN"; pin: string }
  | { type: "SET_KID_PIN"; kidId: KidId; pin: string }
  | { type: "ASSIGN_CHORE"; kidId: KidId; refId: string }
  | { type: "UNASSIGN_CHORE"; assignmentId: string }
  | { type: "UPSERT_SCHEDULE_PLAN"; plan: SchedulePlan }
  | { type: "DELETE_SCHEDULE_PLAN"; planId: string }
  | { type: "ADD_CUSTOM_ACTIVITY"; activity: ActivityIdea }
  | { type: "REMOVE_CUSTOM_ACTIVITY"; activityId: string }
  | { type: "SET_ACTIVITY_IMAGE"; activityId: string; image: string | null }
  | { type: "BUY_GEAR"; kidId: KidId; gearId: string }
  | { type: "EQUIP_GEAR"; kidId: KidId; slot: GearSlot; gearId: string }
  | { type: "SET_THEME"; kidId: KidId; theme: ThemeId }
  | {
      type: "SEND_MESSAGE";
      from: ParticipantId;
      to: ParticipantId;
      text: string;
      photo?: string;
    }
  | { type: "MARK_MESSAGES_READ"; me: ParticipantId; other: ParticipantId }
  | { type: "INGEST_MESSAGES"; messages: Message[] }
  | { type: "SET_CONFIG"; config: SyncConfig }
  | { type: "INGEST_SUBMISSIONS"; submissions: Submission[] }
  | { type: "INGEST_CHORES"; choreAssignments: ChoreAssignment[] }
  | { type: "REPLACE_STATE"; state: AppState }
  | {
      type: "ADD_KID";
      firstName: string;
      emoji: string;
      paletteIndex: number;
      pin: string;
    }
  | { type: "REMOVE_KID"; kidId: KidId }
  | { type: "SET_APP_VISIBILITY"; kidId: KidId; appId: string; visible: boolean }
  | {
      type: "SET_EXPLORE_VISIBILITY";
      kidId: KidId;
      resourceId: string;
      visible: boolean;
    }
  | { type: "RESET_ALL" };

function toggleInArray(arr: string[], id: string): string[] {
  return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
}

/** Re-evaluate one kid's badges and union them with what's already earned. */
function recomputeBadges(state: AppState, kidId: KidId): AppState {
  const stats = computeStats(state, kidId);
  const earned = new Set(state.kids[kidId].badges);
  for (const badge of BADGES) {
    if (badge.earned(stats)) earned.add(badge.id);
  }
  return {
    ...state,
    kids: {
      ...state.kids,
      [kidId]: { ...state.kids[kidId], badges: [...earned] },
    },
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_ACTIVE_KID":
      return { ...state, activeKid: action.kidId };

    case "TOGGLE_SCHEDULE": {
      const date = todayKey();
      const kid = state.kids[action.kidId];
      const day = kid.history[date] ?? { date, scheduleDone: [] };
      const next: AppState = {
        ...state,
        kids: {
          ...state.kids,
          [action.kidId]: {
            ...kid,
            history: {
              ...kid.history,
              [date]: {
                ...day,
                date,
                scheduleDone: toggleInArray(day.scheduleDone, action.blockId),
              },
            },
          },
        },
      };
      return recomputeBadges(next, action.kidId);
    }

    case "COMPLETE_SCHEDULE": {
      // Auto-mark blocks done as their time passes (idempotent union).
      const date = todayKey();
      const kid = state.kids[action.kidId];
      const day = kid.history[date] ?? { date, scheduleDone: [] };
      const set = new Set(day.scheduleDone);
      let changed = false;
      for (const id of action.blockIds) {
        if (!set.has(id)) {
          set.add(id);
          changed = true;
        }
      }
      if (!changed) return state;
      const next: AppState = {
        ...state,
        kids: {
          ...state.kids,
          [action.kidId]: {
            ...kid,
            history: {
              ...kid.history,
              [date]: { ...day, date, scheduleDone: [...set] },
            },
          },
        },
      };
      return recomputeBadges(next, action.kidId);
    }

    case "SUBMIT_TASK": {
      const date = todayKey();
      const now = Date.now();
      const partner =
        action.partnerId && action.partnerId !== action.kidId
          ? action.partnerId
          : undefined;
      // Each participant gets their own submission (so both earn XP), tagged
      // with the other as their partner.
      const participants: { kid: KidId; partner?: KidId }[] = [
        { kid: action.kidId, partner },
      ];
      if (partner) participants.push({ kid: partner, partner: action.kidId });

      let submissions = state.submissions;
      let changed = false;
      for (const p of participants) {
        const alreadyApproved = submissions.some(
          (s) =>
            s.kidId === p.kid &&
            s.refId === action.refId &&
            s.date === date &&
            s.status === "approved",
        );
        if (alreadyApproved) continue;
        // Drop any prior pending/rejected attempt for this task today.
        const kept = submissions.filter(
          (s) =>
            !(
              s.kidId === p.kid &&
              s.refId === action.refId &&
              s.date === date
            ),
        );
        const submission: Submission = {
          id: newId(),
          kind: action.kind,
          refId: action.refId,
          title: action.title,
          emoji: action.emoji,
          kidId: p.kid,
          photo: action.photo,
          status: "pending",
          xp: action.xp,
          date,
          submittedAt: now,
          partnerId: p.partner,
        };
        submissions = [...kept, submission];
        changed = true;
      }
      if (!changed) return state;
      return { ...state, submissions };
    }

    case "REVIEW_SUBMISSION": {
      let reviewedKid: KidId | null = null;
      const submissions = state.submissions.map((s) => {
        if (s.id !== action.submissionId) return s;
        reviewedKid = s.kidId;
        return {
          ...s,
          status: action.decision,
          reviewedAt: Date.now(),
          note: action.note,
          // Free the photo once it's been reviewed.
          photo: action.decision === "approved" ? s.photo : "",
        };
      });
      const next = { ...state, submissions };
      return reviewedKid ? recomputeBadges(next, reviewedKid) : next;
    }

    case "SET_PARENT_PIN":
      return { ...state, parentPin: action.pin || state.parentPin };

    case "SET_KID_PIN":
      return {
        ...state,
        kidPins: {
          ...state.kidPins,
          [action.kidId]: action.pin || state.kidPins[action.kidId],
        },
      };

    case "ASSIGN_CHORE": {
      const date = todayKey();
      // Don't assign the same chore to the same kid twice in one day.
      const exists = state.choreAssignments.some(
        (c) =>
          c.kidId === action.kidId &&
          c.refId === action.refId &&
          c.date === date,
      );
      if (exists) return state;
      const assignment: ChoreAssignment = {
        id: newId(),
        kidId: action.kidId,
        refId: action.refId,
        date,
        assignedAt: Date.now(),
      };
      return {
        ...state,
        choreAssignments: [...state.choreAssignments, assignment],
      };
    }

    case "UNASSIGN_CHORE":
      return {
        ...state,
        choreAssignments: state.choreAssignments.filter(
          (c) => c.id !== action.assignmentId,
        ),
      };

    case "UPSERT_SCHEDULE_PLAN": {
      // Family plan is always family-scoped; custom plans are kids-scoped.
      const incoming: SchedulePlan =
        action.plan.id === FAMILY_PLAN_ID
          ? { ...action.plan, scope: { kind: "family" } }
          : action.plan;
      // A kid follows at most one custom plan, so adding kids here removes them
      // from any other custom plan (keeps resolution unambiguous).
      const claimed =
        incoming.scope.kind === "kids"
          ? new Set(incoming.scope.kidIds)
          : new Set<KidId>();
      let found = false;
      const schedules = state.schedules.map((p) => {
        if (p.id === incoming.id) {
          found = true;
          return incoming;
        }
        if (p.scope.kind === "kids" && claimed.size) {
          const kept = p.scope.kidIds.filter((id) => !claimed.has(id));
          if (kept.length !== p.scope.kidIds.length) {
            return { ...p, scope: { kind: "kids", kidIds: kept } as ScheduleScope };
          }
        }
        return p;
      });
      if (!found) schedules.push(incoming);
      return { ...state, schedules };
    }

    case "DELETE_SCHEDULE_PLAN": {
      if (action.planId === FAMILY_PLAN_ID) return state; // never delete family
      return {
        ...state,
        schedules: state.schedules.filter((p) => p.id !== action.planId),
      };
    }

    case "ADD_CUSTOM_ACTIVITY": {
      const a = action.activity;
      if (!a || !a.id || !a.title.trim()) return state;
      return {
        ...state,
        customActivities: [
          ...state.customActivities.filter((c) => c.id !== a.id),
          { ...a, custom: true },
        ],
      };
    }

    case "REMOVE_CUSTOM_ACTIVITY": {
      const images = omitKey(state.activityImages, action.activityId);
      return {
        ...state,
        customActivities: state.customActivities.filter(
          (a) => a.id !== action.activityId,
        ),
        activityImages: images,
      };
    }

    case "SET_ACTIVITY_IMAGE": {
      if (!action.image) {
        return {
          ...state,
          activityImages: omitKey(state.activityImages, action.activityId),
        };
      }
      return {
        ...state,
        activityImages: {
          ...state.activityImages,
          [action.activityId]: action.image,
        },
      };
    }

    case "BUY_GEAR": {
      const item = GEAR_BY_ID[action.gearId];
      if (!item || item.price <= 0) return state;
      if (ownsGear(state, action.kidId, action.gearId)) return state;
      // Enforce affordability and any level requirement.
      if (coinBalance(state, action.kidId) < item.price) return state;
      if (
        item.levelReq &&
        getLevelInfo(getKidXp(state, action.kidId)).rank.level < item.levelReq
      ) {
        return state;
      }
      const owned = state.ownedGear[action.kidId] ?? [];
      return {
        ...state,
        coinsSpent: {
          ...state.coinsSpent,
          [action.kidId]: (state.coinsSpent[action.kidId] ?? 0) + item.price,
        },
        ownedGear: {
          ...state.ownedGear,
          [action.kidId]: [...owned, action.gearId],
        },
        // Auto-equip the freshly bought piece.
        avatar: {
          ...state.avatar,
          [action.kidId]: {
            ...(state.avatar[action.kidId] ?? {}),
            [item.slot]: action.gearId,
          },
        },
      };
    }

    case "EQUIP_GEAR": {
      const item = GEAR_BY_ID[action.gearId];
      if (!item || item.slot !== action.slot) return state;
      if (!ownsGear(state, action.kidId, action.gearId)) return state;
      return {
        ...state,
        avatar: {
          ...state.avatar,
          [action.kidId]: {
            ...(state.avatar[action.kidId] ?? {}),
            [action.slot]: action.gearId,
          },
        },
      };
    }

    case "SET_THEME":
      return {
        ...state,
        themes: { ...state.themes, [action.kidId]: action.theme },
      };

    case "SEND_MESSAGE": {
      const text = action.text.trim();
      if ((!text && !action.photo) || action.from === action.to) return state;
      const message: Message = {
        id: newId(),
        from: action.from,
        to: action.to,
        text: text.slice(0, 500),
        at: Date.now(),
        read: false,
        // Omit photo entirely when absent (Firebase rejects `undefined`).
        ...(action.photo ? { photo: action.photo } : {}),
      };
      return { ...state, messages: [...state.messages, message].slice(-300) };
    }

    case "MARK_MESSAGES_READ": {
      let changed = false;
      const messages = state.messages.map((m) => {
        if (m.to === action.me && m.from === action.other && !m.read) {
          changed = true;
          return { ...m, read: true };
        }
        return m;
      });
      return changed ? { ...state, messages } : state;
    }

    case "INGEST_MESSAGES": {
      // Merge in messages from another device (cross-device sync), by id.
      const have = new Set(state.messages.map((m) => m.id));
      const add = action.messages.filter((m) => m && m.id && !have.has(m.id));
      if (!add.length) return state;
      const merged = [...state.messages, ...add]
        .sort((a, b) => a.at - b.at)
        .slice(-300);
      return { ...state, messages: merged };
    }

    case "SET_CONFIG": {
      // Merge the shared family setup from another device. The roster is a
      // UNION of both sides (so an add on one device is never clobbered by the
      // other), minus the union of tombstones (so removals stick). Per-kid
      // settings prefer the remote copy (propagates edits), falling back local.
      const cfg = action.config;
      if (!Array.isArray(cfg.kidProfiles)) return state;

      const removed = Array.from(
        new Set([...(state.removedKids ?? []), ...(cfg.removedKids ?? [])]),
      );
      const remoteById = new Map(cfg.kidProfiles.map((k) => [k.id, k]));
      const kidProfiles: Kid[] = [];
      for (const k of cfg.kidProfiles) {
        if (!removed.includes(k.id)) kidProfiles.push(k);
      }
      for (const k of state.kidProfiles) {
        if (!removed.includes(k.id) && !remoteById.has(k.id)) {
          kidProfiles.push(k);
        }
      }
      if (kidProfiles.length === 0) return state; // never end up with no kids

      const pick = <V,>(
        rm: Record<string, V> | undefined,
        lo: Record<string, V>,
        id: string,
        def: V,
      ): V => (rm && id in rm ? rm[id] : id in lo ? lo[id] : def);

      const kids = { ...state.kids };
      const kidPins: Record<string, string> = {};
      const themes: Record<string, ThemeId> = {};
      const appVisibility: Record<string, string[]> = {};
      const exploreHidden: Record<string, string[]> = {};
      const coinsSpent: Record<string, number> = {};
      const ownedGear: Record<string, string[]> = {};
      const avatar: Record<string, AvatarConfig> = {};
      for (const k of kidProfiles) {
        kids[k.id] = state.kids[k.id] ?? emptyKidState();
        kidPins[k.id] = pick(cfg.kidPins, state.kidPins, k.id, "0000");
        themes[k.id] = pick(cfg.themes, state.themes, k.id, "sparkle");
        appVisibility[k.id] = pick(cfg.appVisibility, state.appVisibility, k.id, []);
        exploreHidden[k.id] = pick(cfg.exploreHidden, state.exploreHidden, k.id, []);
        coinsSpent[k.id] = pick(cfg.coinsSpent, state.coinsSpent, k.id, 0);
        ownedGear[k.id] = pick(cfg.ownedGear, state.ownedGear, k.id, []);
        avatar[k.id] = pick(cfg.avatar, state.avatar, k.id, {});
      }
      const activeKid = kidProfiles.some((k) => k.id === state.activeKid)
        ? state.activeKid
        : kidProfiles[0].id;

      // Schedules are shared config: prefer the remote copy (propagates edits),
      // but keep kid assignments limited to kids that still exist. Firebase
      // strips empty arrays, so a synced plan may arrive without kidIds/blocks
      // — normalize defensively to arrays.
      const liveIds = new Set(kidProfiles.map((k) => k.id));
      const rawSchedules =
        Array.isArray(cfg.schedules) && cfg.schedules.length
          ? cfg.schedules
          : state.schedules;
      let schedules: SchedulePlan[] = (rawSchedules ?? []).map((p) => {
        const blocks = Array.isArray(p.blocks) ? p.blocks : [];
        if (p.scope?.kind === "kids") {
          const kidIds = Array.isArray(p.scope.kidIds) ? p.scope.kidIds : [];
          return {
            ...p,
            blocks,
            scope: { kind: "kids", kidIds: kidIds.filter((id) => liveIds.has(id)) },
          };
        }
        return { ...p, blocks, scope: { kind: "family" } };
      });
      if (!schedules.some((p) => p.scope.kind === "family")) {
        schedules = [defaultSchedules()[0], ...schedules];
      }

      return {
        ...state,
        kidProfiles,
        removedKids: removed,
        kids,
        kidPins,
        themes,
        appVisibility,
        exploreHidden,
        schedules,
        customActivities: Array.isArray(cfg.customActivities)
          ? cfg.customActivities
          : state.customActivities,
        activityImages:
          cfg.activityImages && typeof cfg.activityImages === "object"
            ? cfg.activityImages
            : state.activityImages,
        coinsSpent,
        ownedGear,
        avatar,
        parentPin: cfg.parentPin || state.parentPin,
        activeKid,
      };
    }

    case "INGEST_SUBMISSIONS": {
      // Merge submissions (incl. photos) from another device, by id. Prefer the
      // more-reviewed copy so an approval isn't overwritten by a stale pending.
      const byId = new Map(state.submissions.map((s) => [s.id, s]));
      let changed = false;
      const affected = new Set<KidId>();
      for (const r of action.submissions) {
        if (!r || !r.id) continue;
        const l = byId.get(r.id);
        if (!l) {
          byId.set(r.id, r);
          changed = true;
          affected.add(r.kidId);
          continue;
        }
        const lr = l.reviewedAt ?? 0;
        const rr = r.reviewedAt ?? 0;
        if (lr > 0 && rr === 0) continue; // don't downgrade a reviewed item
        const differs =
          l.status !== r.status ||
          (l.reviewedAt ?? 0) !== rr ||
          (l.note ?? "") !== (r.note ?? "") ||
          !!l.photo !== !!r.photo;
        if (rr >= lr && differs) {
          byId.set(r.id, r);
          changed = true;
          affected.add(r.kidId);
        }
      }
      if (!changed) return state;
      let next: AppState = {
        ...state,
        submissions: [...byId.values()]
          .sort((a, b) => a.submittedAt - b.submittedAt)
          .slice(-240),
      };
      for (const kid of affected) next = recomputeBadges(next, kid);
      return next;
    }

    case "INGEST_CHORES": {
      const have = new Set(state.choreAssignments.map((c) => c.id));
      const add = action.choreAssignments.filter(
        (c) => c && c.id && !have.has(c.id),
      );
      if (!add.length) return state;
      return {
        ...state,
        choreAssignments: [...state.choreAssignments, ...add],
      };
    }

    case "REPLACE_STATE":
      return action.state;

    case "ADD_KID": {
      const firstName = action.firstName.trim().slice(0, 24);
      if (!firstName) return state;
      const id = `kid-${newId().slice(0, 8)}`;
      const kid = makeKid({
        id,
        firstName,
        emoji: action.emoji,
        paletteIndex: action.paletteIndex,
      });
      return {
        ...state,
        kidProfiles: [...state.kidProfiles, kid],
        removedKids: state.removedKids.filter((x) => x !== id),
        kids: { ...state.kids, [id]: emptyKidState() },
        kidPins: { ...state.kidPins, [id]: action.pin.trim() || "0000" },
        themes: { ...state.themes, [id]: "sparkle" },
        appVisibility: { ...state.appVisibility, [id]: [...DEFAULT_NEW_KID_APPS] },
        exploreHidden: { ...state.exploreHidden, [id]: [] },
        coinsSpent: { ...state.coinsSpent, [id]: 0 },
        ownedGear: { ...state.ownedGear, [id]: [] },
        avatar: { ...state.avatar, [id]: {} },
      };
    }

    case "REMOVE_KID": {
      const kidProfiles = state.kidProfiles.filter((k) => k.id !== action.kidId);
      // Never remove the last child.
      if (kidProfiles.length === state.kidProfiles.length) return state;
      if (kidProfiles.length === 0) return state;
      return {
        ...state,
        kidProfiles,
        removedKids: state.removedKids.includes(action.kidId)
          ? state.removedKids
          : [...state.removedKids, action.kidId],
        kids: omitKey(state.kids, action.kidId),
        kidPins: omitKey(state.kidPins, action.kidId),
        themes: omitKey(state.themes, action.kidId),
        appVisibility: omitKey(state.appVisibility, action.kidId),
        exploreHidden: omitKey(state.exploreHidden, action.kidId),
        coinsSpent: omitKey(state.coinsSpent, action.kidId),
        ownedGear: omitKey(state.ownedGear, action.kidId),
        avatar: omitKey(state.avatar, action.kidId),
        submissions: state.submissions.filter((s) => s.kidId !== action.kidId),
        choreAssignments: state.choreAssignments.filter(
          (c) => c.kidId !== action.kidId,
        ),
        schedules: state.schedules.map((p) =>
          p.scope.kind === "kids"
            ? {
                ...p,
                scope: {
                  kind: "kids",
                  kidIds: p.scope.kidIds.filter((id) => id !== action.kidId),
                },
              }
            : p,
        ),
        messages: state.messages.filter(
          (m) => m.from !== action.kidId && m.to !== action.kidId,
        ),
        activeKid:
          state.activeKid === action.kidId
            ? kidProfiles[0].id
            : state.activeKid,
      };
    }

    case "SET_APP_VISIBILITY": {
      const cur = state.appVisibility[action.kidId] ?? [];
      const has = cur.includes(action.appId);
      if (action.visible === has) return state;
      const next = action.visible
        ? [...cur, action.appId]
        : cur.filter((id) => id !== action.appId);
      return {
        ...state,
        appVisibility: { ...state.appVisibility, [action.kidId]: next },
      };
    }

    case "SET_EXPLORE_VISIBILITY": {
      // Stored as a "hidden" list, so default (not present) = visible.
      const cur = state.exploreHidden[action.kidId] ?? [];
      const hidden = cur.includes(action.resourceId);
      if (action.visible === !hidden) return state;
      const next = action.visible
        ? cur.filter((id) => id !== action.resourceId)
        : [...cur, action.resourceId];
      return {
        ...state,
        exploreHidden: { ...state.exploreHidden, [action.kidId]: next },
      };
    }

    case "RESET_ALL":
      return defaultState();

    default:
      return state;
  }
}

type AppContextValue = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Keep every same-browser tab in sync: when another tab writes our storage
  // key (e.g. sends a message), reload and replace state here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        dispatch({ type: "REPLACE_STATE", state: loadState() });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
