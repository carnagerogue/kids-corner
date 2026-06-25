import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AppState,
  ChoreAssignment,
  KidId,
  Message,
  MessageFrom,
  Submission,
  SubmissionKind,
  ThemeId,
} from "../types";
import {
  defaultState,
  emptyKidState,
  loadState,
  newId,
  saveState,
  STORAGE_KEY,
  todayKey,
} from "./storage";
import { computeStats } from "./selectors";
import { BADGES } from "../data/badges";
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
  | { type: "SET_THEME"; kidId: KidId; theme: ThemeId }
  | { type: "SEND_MESSAGE"; kidId: KidId; from: MessageFrom; text: string }
  | { type: "MARK_MESSAGES_READ"; kidId: KidId; reader: MessageFrom }
  | { type: "INGEST_MESSAGES"; messages: Message[] }
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
      // Already approved today? Don't allow a re-submit.
      const alreadyApproved = state.submissions.some(
        (s) =>
          s.kidId === action.kidId &&
          s.refId === action.refId &&
          s.date === date &&
          s.status === "approved",
      );
      if (alreadyApproved) return state;

      // Drop any prior pending/rejected attempt for this task today.
      const kept = state.submissions.filter(
        (s) =>
          !(
            s.kidId === action.kidId &&
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
        kidId: action.kidId,
        photo: action.photo,
        status: "pending",
        xp: action.xp,
        date,
        submittedAt: Date.now(),
      };
      return { ...state, submissions: [...kept, submission] };
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

    case "SET_THEME":
      return {
        ...state,
        themes: { ...state.themes, [action.kidId]: action.theme },
      };

    case "SEND_MESSAGE": {
      const text = action.text.trim();
      if (!text) return state;
      const message: Message = {
        id: newId(),
        kidId: action.kidId,
        from: action.from,
        text: text.slice(0, 500),
        at: Date.now(),
        // The sender has obviously already "read" their own message.
        readByKid: action.from === "kid",
        readByParent: action.from === "parent",
      };
      return { ...state, messages: [...state.messages, message].slice(-300) };
    }

    case "MARK_MESSAGES_READ": {
      let changed = false;
      const messages = state.messages.map((m) => {
        if (m.kidId !== action.kidId) return m;
        if (action.reader === "kid" && !m.readByKid) {
          changed = true;
          return { ...m, readByKid: true };
        }
        if (action.reader === "parent" && !m.readByParent) {
          changed = true;
          return { ...m, readByParent: true };
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
        kids: { ...state.kids, [id]: emptyKidState() },
        kidPins: { ...state.kidPins, [id]: action.pin.trim() || "0000" },
        themes: { ...state.themes, [id]: "sparkle" },
        appVisibility: { ...state.appVisibility, [id]: [...DEFAULT_NEW_KID_APPS] },
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
        kids: omitKey(state.kids, action.kidId),
        kidPins: omitKey(state.kidPins, action.kidId),
        themes: omitKey(state.themes, action.kidId),
        appVisibility: omitKey(state.appVisibility, action.kidId),
        submissions: state.submissions.filter((s) => s.kidId !== action.kidId),
        choreAssignments: state.choreAssignments.filter(
          (c) => c.kidId !== action.kidId,
        ),
        messages: state.messages.filter((m) => m.kidId !== action.kidId),
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
