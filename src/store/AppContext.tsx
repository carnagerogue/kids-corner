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
  Submission,
  SubmissionKind,
  ThemeId,
} from "../types";
import {
  defaultState,
  loadState,
  newId,
  saveState,
  todayKey,
} from "./storage";
import { computeStats } from "./selectors";
import { BADGES } from "../data/badges";

export type Action =
  | { type: "SET_ACTIVE_KID"; kidId: KidId }
  | { type: "TOGGLE_SCHEDULE"; kidId: KidId; blockId: string }
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

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within <AppProvider>");
  return ctx;
}
