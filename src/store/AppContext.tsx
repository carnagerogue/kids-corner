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
  Announcement,
  AppState,
  Avatar3DBuyInfo,
  Avatar3DSlot,
  AvatarConfig,
  ChoreAssignment,
  FamilyGoal,
  GearSlot,
  Kid,
  KidId,
  Loadout3D,
  Message,
  ParticipantId,
  Reaction,
  SavedLoadout3D,
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
  coinsBonus: Record<string, number>;
  lastSpin: Record<string, string>;
  ownedGear: Record<string, string[]>;
  avatar: Record<string, AvatarConfig>;
  avatar3d: Record<string, Loadout3D>;
  loadouts3d: Record<string, SavedLoadout3D[]>;
  purchasesLocked: Record<string, boolean>;
  familyGoal: FamilyGoal | null;
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
import {
  canSpinFree,
  coinBalance,
  computeStats,
  getKidXp,
  ownsGear,
} from "./selectors";
import { BADGES } from "../data/badges";
import { GEAR_BY_ID, SPIN_COST } from "../data/avatar";
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
  // --- 3D avatar actions (reuse the same coin ledger) ---
  | { type: "BUY_AVATAR_ITEM"; kidId: KidId; item: Avatar3DBuyInfo }
  | {
      type: "EQUIP_AVATAR_ITEM";
      kidId: KidId;
      slot: Avatar3DSlot;
      itemId: string | null;
    }
  | { type: "GRANT_COINS"; kidId: KidId; amount: number }
  | { type: "GRANT_AVATAR_ITEM"; kidId: KidId; itemId: string }
  | { type: "RESET_AVATAR3D"; kidId: KidId }
  | { type: "SET_PURCHASES_LOCKED"; kidId: KidId; locked: boolean }
  | { type: "SAVE_LOADOUT"; kidId: KidId; name: string; emoji?: string }
  | { type: "APPLY_LOADOUT"; kidId: KidId; loadoutId: string }
  | { type: "DELETE_LOADOUT"; kidId: KidId; loadoutId: string }
  | {
      type: "APPLY_SPIN";
      kidId: KidId;
      coins: number;
      gearId?: string;
      free: boolean;
    }
  | { type: "SET_THEME"; kidId: KidId; theme: ThemeId }
  | {
      type: "SEND_MESSAGE";
      from: ParticipantId;
      to: ParticipantId;
      text: string;
      photo?: string;
    }
  | { type: "MARK_MESSAGES_READ"; me: ParticipantId; other: ParticipantId }
  | { type: "DELETE_MESSAGE"; id: string; by: ParticipantId }
  | { type: "INGEST_MESSAGES"; messages: Message[] }
  | { type: "SEND_ANNOUNCEMENT"; text: string }
  | { type: "DELETE_ANNOUNCEMENT"; id: string }
  | { type: "INGEST_ANNOUNCEMENTS"; announcements: Announcement[] }
  | { type: "TOGGLE_REACTION"; submissionId: string; by: KidId; emoji: string }
  | { type: "INGEST_REACTIONS"; reactions: Reaction[] }
  | { type: "SET_FAMILY_GOAL"; target: number; reward: string }
  | { type: "CLEAR_FAMILY_GOAL" }
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
          // Omit partner when solo (Firebase rejects `undefined`).
          ...(p.partner ? { partnerId: p.partner } : {}),
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
          // Omit note when absent (Firebase rejects `undefined`).
          ...(action.note ? { note: action.note } : { note: "" }),
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

    case "BUY_AVATAR_ITEM": {
      const { kidId, item } = action;
      if (item.price <= 0) return state; // free items never need buying
      if (state.purchasesLocked?.[kidId]) return state; // grown-up lock
      if ((state.ownedGear[kidId] ?? []).includes(item.id)) return state;
      if (coinBalance(state, kidId) < item.price) return state;
      if (
        item.levelReq &&
        getLevelInfo(getKidXp(state, kidId)).rank.level < item.levelReq
      ) {
        return state;
      }
      const owned = state.ownedGear[kidId] ?? [];
      return {
        ...state,
        coinsSpent: {
          ...state.coinsSpent,
          [kidId]: (state.coinsSpent[kidId] ?? 0) + item.price,
        },
        ownedGear: { ...state.ownedGear, [kidId]: [...owned, item.id] },
        // Auto-equip the freshly bought piece.
        avatar3d: {
          ...state.avatar3d,
          [kidId]: { ...(state.avatar3d[kidId] ?? {}), [item.slot]: item.id },
        },
      };
    }

    case "EQUIP_AVATAR_ITEM": {
      const { kidId, slot, itemId } = action;
      const next: Loadout3D = { ...(state.avatar3d[kidId] ?? {}) };
      if (itemId === null) delete next[slot];
      else next[slot] = itemId;
      return { ...state, avatar3d: { ...state.avatar3d, [kidId]: next } };
    }

    case "GRANT_COINS": {
      // Grown-up add (+) or remove (−) coins. coinBalance() floors at 0, so a
      // big negative just zeroes the spendable balance.
      const { kidId, amount } = action;
      if (!amount) return state;
      return {
        ...state,
        coinsBonus: {
          ...state.coinsBonus,
          [kidId]: (state.coinsBonus[kidId] ?? 0) + amount,
        },
      };
    }

    case "GRANT_AVATAR_ITEM": {
      // Grown-up unlocks an item as a reward (no coin cost). Works for any
      // owned-gear id (2D or 3D).
      const { kidId, itemId } = action;
      const owned = state.ownedGear[kidId] ?? [];
      if (owned.includes(itemId)) return state;
      return {
        ...state,
        ownedGear: { ...state.ownedGear, [kidId]: [...owned, itemId] },
      };
    }

    case "RESET_AVATAR3D": {
      return {
        ...state,
        avatar3d: { ...state.avatar3d, [action.kidId]: {} },
      };
    }

    case "SET_PURCHASES_LOCKED": {
      return {
        ...state,
        purchasesLocked: {
          ...state.purchasesLocked,
          [action.kidId]: action.locked,
        },
      };
    }

    case "SAVE_LOADOUT": {
      const { kidId, name, emoji } = action;
      const preset: SavedLoadout3D = {
        id: newId(),
        name: name.trim() || "My Look",
        loadout: { ...(state.avatar3d[kidId] ?? {}) },
        ...(emoji ? { emoji } : {}),
      };
      const list = state.loadouts3d[kidId] ?? [];
      return {
        ...state,
        loadouts3d: {
          ...state.loadouts3d,
          [kidId]: [...list, preset].slice(-12),
        },
      };
    }

    case "APPLY_LOADOUT": {
      const { kidId, loadoutId } = action;
      const preset = (state.loadouts3d[kidId] ?? []).find(
        (l) => l.id === loadoutId,
      );
      if (!preset) return state;
      return {
        ...state,
        avatar3d: { ...state.avatar3d, [kidId]: { ...preset.loadout } },
      };
    }

    case "DELETE_LOADOUT": {
      const { kidId, loadoutId } = action;
      const list = state.loadouts3d[kidId] ?? [];
      return {
        ...state,
        loadouts3d: {
          ...state.loadouts3d,
          [kidId]: list.filter((l) => l.id !== loadoutId),
        },
      };
    }

    case "APPLY_SPIN": {
      const kid = action.kidId;
      // Validate the spin is actually allowed (free once/day, else affordable).
      if (action.free) {
        if (!canSpinFree(state, kid)) return state;
      } else if (coinBalance(state, kid) < SPIN_COST) {
        return state;
      }
      const owned = state.ownedGear[kid] ?? [];
      const newOwned =
        action.gearId && !owned.includes(action.gearId)
          ? [...owned, action.gearId]
          : owned;
      return {
        ...state,
        coinsBonus: {
          ...state.coinsBonus,
          [kid]: (state.coinsBonus[kid] ?? 0) + Math.max(0, action.coins),
        },
        coinsSpent: action.free
          ? state.coinsSpent
          : { ...state.coinsSpent, [kid]: (state.coinsSpent[kid] ?? 0) + SPIN_COST },
        lastSpin: action.free
          ? { ...state.lastSpin, [kid]: todayKey() }
          : state.lastSpin,
        ownedGear: { ...state.ownedGear, [kid]: newOwned },
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
      // Guard against accidental double-taps: drop an identical message sent to
      // the same person within the last second.
      const now0 = Date.now();
      const isDup = state.messages.some(
        (m) =>
          m.from === action.from &&
          m.to === action.to &&
          !m.deleted &&
          m.text === text.slice(0, 500) &&
          !!m.photo === !!action.photo &&
          now0 - m.at < 1000,
      );
      if (isDup) return state;
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

    case "DELETE_MESSAGE": {
      // Only the sender can delete their own message (soft tombstone).
      let changed = false;
      const messages = state.messages.map((m) => {
        if (m.id === action.id && m.from === action.by && !m.deleted) {
          changed = true;
          return { ...m, deleted: true, text: "", photo: "" };
        }
        return m;
      });
      return changed ? { ...state, messages } : state;
    }

    case "INGEST_MESSAGES": {
      // Merge messages from another device by id: add new ones and apply
      // remote deletions (so a delete on one device propagates everywhere).
      const byId = new Map(state.messages.map((m) => [m.id, m]));
      let changed = false;
      for (const r of action.messages) {
        if (!r || !r.id) continue;
        const l = byId.get(r.id);
        if (!l) {
          byId.set(r.id, r);
          changed = true;
        } else if (r.deleted && !l.deleted) {
          byId.set(r.id, { ...l, deleted: true, text: "", photo: "" });
          changed = true;
        }
      }
      if (!changed) return state;
      const merged = [...byId.values()]
        .sort((a, b) => a.at - b.at)
        .slice(-300);
      return { ...state, messages: merged };
    }

    case "SEND_ANNOUNCEMENT": {
      const text = action.text.trim();
      if (!text) return state;
      const announcement: Announcement = {
        id: newId(),
        text: text.slice(0, 280),
        at: Date.now(),
      };
      return {
        ...state,
        announcements: [...state.announcements, announcement].slice(-50),
      };
    }

    case "DELETE_ANNOUNCEMENT": {
      let changed = false;
      const announcements = state.announcements.map((a) => {
        if (a.id === action.id && !a.deleted) {
          changed = true;
          return { ...a, deleted: true, text: "" };
        }
        return a;
      });
      return changed ? { ...state, announcements } : state;
    }

    case "INGEST_ANNOUNCEMENTS": {
      const byId = new Map(state.announcements.map((a) => [a.id, a]));
      let changed = false;
      for (const r of action.announcements) {
        if (!r || !r.id) continue;
        const l = byId.get(r.id);
        if (!l) {
          byId.set(r.id, r);
          changed = true;
        } else if (r.deleted && !l.deleted) {
          byId.set(r.id, { ...l, deleted: true, text: "" });
          changed = true;
        }
      }
      if (!changed) return state;
      const merged = [...byId.values()].sort((a, b) => a.at - b.at).slice(-50);
      return { ...state, announcements: merged };
    }

    case "TOGGLE_REACTION": {
      const existing = state.reactions.find(
        (r) =>
          !r.deleted &&
          r.submissionId === action.submissionId &&
          r.by === action.by &&
          r.emoji === action.emoji,
      );
      if (existing) {
        return {
          ...state,
          reactions: state.reactions.map((r) =>
            r.id === existing.id ? { ...r, deleted: true } : r,
          ),
        };
      }
      const reaction: Reaction = {
        id: newId(),
        submissionId: action.submissionId,
        by: action.by,
        emoji: action.emoji,
        at: Date.now(),
      };
      return { ...state, reactions: [...state.reactions, reaction].slice(-500) };
    }

    case "INGEST_REACTIONS": {
      const byId = new Map(state.reactions.map((r) => [r.id, r]));
      let changed = false;
      for (const r of action.reactions) {
        if (!r || !r.id) continue;
        const l = byId.get(r.id);
        if (!l) {
          byId.set(r.id, r);
          changed = true;
        } else if (r.deleted && !l.deleted) {
          byId.set(r.id, { ...l, deleted: true });
          changed = true;
        }
      }
      if (!changed) return state;
      return {
        ...state,
        reactions: [...byId.values()].sort((a, b) => a.at - b.at).slice(-500),
      };
    }

    case "SET_FAMILY_GOAL": {
      const target = Math.max(1, Math.round(action.target));
      return {
        ...state,
        familyGoal: { target, reward: action.reward.trim().slice(0, 80), since: todayKey() },
      };
    }

    case "CLEAR_FAMILY_GOAL":
      return { ...state, familyGoal: null };

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
      const coinsBonus: Record<string, number> = {};
      const lastSpin: Record<string, string> = {};
      const ownedGear: Record<string, string[]> = {};
      const avatar: Record<string, AvatarConfig> = {};
      const avatar3d: Record<string, Loadout3D> = {};
      const loadouts3d: Record<string, SavedLoadout3D[]> = {};
      const purchasesLocked: Record<string, boolean> = {};
      for (const k of kidProfiles) {
        kids[k.id] = state.kids[k.id] ?? emptyKidState();
        kidPins[k.id] = pick(cfg.kidPins, state.kidPins, k.id, "0000");
        themes[k.id] = pick(cfg.themes, state.themes, k.id, "sparkle");
        appVisibility[k.id] = pick(cfg.appVisibility, state.appVisibility, k.id, []);
        exploreHidden[k.id] = pick(cfg.exploreHidden, state.exploreHidden, k.id, []);
        coinsSpent[k.id] = pick(cfg.coinsSpent, state.coinsSpent, k.id, 0);
        coinsBonus[k.id] = pick(cfg.coinsBonus, state.coinsBonus, k.id, 0);
        lastSpin[k.id] = pick(cfg.lastSpin, state.lastSpin, k.id, "");
        ownedGear[k.id] = pick(cfg.ownedGear, state.ownedGear, k.id, []);
        avatar[k.id] = pick(cfg.avatar, state.avatar, k.id, {});
        avatar3d[k.id] = pick(cfg.avatar3d, state.avatar3d, k.id, {});
        loadouts3d[k.id] = pick(cfg.loadouts3d, state.loadouts3d, k.id, []);
        purchasesLocked[k.id] = pick(
          cfg.purchasesLocked,
          state.purchasesLocked,
          k.id,
          false,
        );
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
        coinsBonus,
        lastSpin,
        ownedGear,
        avatar,
        avatar3d,
        loadouts3d,
        purchasesLocked,
        familyGoal:
          cfg.familyGoal !== undefined ? cfg.familyGoal : state.familyGoal,
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
        coinsBonus: { ...state.coinsBonus, [id]: 0 },
        lastSpin: { ...state.lastSpin, [id]: "" },
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
        coinsBonus: omitKey(state.coinsBonus, action.kidId),
        lastSpin: omitKey(state.lastSpin, action.kidId),
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
        reactions: state.reactions.filter((r) => r.by !== action.kidId),
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
