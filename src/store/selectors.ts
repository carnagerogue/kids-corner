import type {
  ActivityCategory,
  AppState,
  ChoreAssignment,
  DayProgress,
  KidId,
  KidStats,
  Message,
  Submission,
  SubmissionStatus,
} from "../types";
import { ACTIVITY_BY_ID, CATEGORY_ORDER } from "../data/activities";
import { SCHEDULE } from "../data/schedule";
import { todayKey } from "./storage";

const EMPTY_DAY = (date: string): DayProgress => ({
  date,
  scheduleDone: [],
});

export function getDay(
  state: AppState,
  kidId: KidId,
  date: string = todayKey(),
): DayProgress {
  return state.kids[kidId].history[date] ?? EMPTY_DAY(date);
}

export function kidSubmissions(state: AppState, kidId: KidId): Submission[] {
  return state.submissions.filter((s) => s.kidId === kidId);
}

export function approvedSubmissions(
  state: AppState,
  kidId: KidId,
): Submission[] {
  return state.submissions.filter(
    (s) => s.kidId === kidId && s.status === "approved",
  );
}

/**
 * XP is effort-based: only approved photo-proof work (missions + assignments)
 * earns XP. The schedule auto-tracks the day but does not award XP.
 */
export function getKidXp(state: AppState, kidId: KidId): number {
  let xp = 0;
  for (const s of approvedSubmissions(state, kidId)) xp += s.xp;
  return xp;
}

/** Status of a given task for a kid on a given day (latest submission wins). */
export function taskStatus(
  state: AppState,
  kidId: KidId,
  refId: string,
  date: string = todayKey(),
): { status: SubmissionStatus | "none"; submission: Submission | null } {
  const matches = state.submissions
    .filter((s) => s.kidId === kidId && s.refId === refId && s.date === date)
    .sort((a, b) => a.submittedAt - b.submittedAt);
  const latest = matches[matches.length - 1] ?? null;
  return { status: latest ? latest.status : "none", submission: latest };
}

/** Chores a grown-up assigned to one kid for a given day. */
export function choreAssignmentsFor(
  state: AppState,
  kidId: KidId,
  date: string = todayKey(),
): ChoreAssignment[] {
  return state.choreAssignments
    .filter((c) => c.kidId === kidId && c.date === date)
    .sort((a, b) => a.assignedAt - b.assignedAt);
}

// --- Messages -------------------------------------------------------------

/** One kid's thread with the grown-ups, oldest first. */
export function messagesForKid(state: AppState, kidId: KidId): Message[] {
  return state.messages
    .filter((m) => m.kidId === kidId)
    .sort((a, b) => a.at - b.at);
}

/** Messages a kid hasn't read yet (i.e. unread replies from a grown-up). */
export function kidUnreadCount(state: AppState, kidId: KidId): number {
  return state.messages.reduce(
    (n, m) =>
      m.kidId === kidId && m.from === "parent" && !m.readByKid ? n + 1 : n,
    0,
  );
}

/** Messages from kids the grown-ups haven't read yet (optionally one kid). */
export function parentUnreadCount(state: AppState, kidId?: KidId): number {
  return state.messages.reduce((n, m) => {
    if (m.from !== "kid" || m.readByParent) return n;
    if (kidId && m.kidId !== kidId) return n;
    return n + 1;
  }, 0);
}

export function pendingSubmissions(state: AppState): Submission[] {
  return state.submissions
    .filter((s) => s.status === "pending")
    .sort((a, b) => a.submittedAt - b.submittedAt);
}

export function pendingCount(state: AppState): number {
  return state.submissions.reduce(
    (n, s) => (s.status === "pending" ? n + 1 : n),
    0,
  );
}

function emptyCategoryCounts(): Record<ActivityCategory, number> {
  const counts = {} as Record<ActivityCategory, number>;
  for (const c of CATEGORY_ORDER) counts[c] = 0;
  return counts;
}

function isoKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Consecutive days (ending today or yesterday) with at least one completion. */
export function computeStreak(
  state: AppState,
  kidId: KidId,
  today: string = todayKey(),
): number {
  const kid = state.kids[kidId];
  const approvedDates = new Set(
    approvedSubmissions(state, kidId).map((s) => s.date),
  );

  const activeOn = (date: string): boolean => {
    const day = kid.history[date];
    const hasSchedule = !!day && day.scheduleDone.length > 0;
    return hasSchedule || approvedDates.has(date);
  };

  const cursor = new Date(`${today}T00:00:00`);
  if (!activeOn(today)) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const key = isoKey(cursor);
    if (activeOn(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export function computeStats(
  state: AppState,
  kidId: KidId,
  today: string = todayKey(),
): KidStats {
  const kid = state.kids[kidId];
  const categoryCounts = emptyCategoryCounts();
  let totalMissions = 0;
  let totalAssignments = 0;
  let totalScheduleBlocks = 0;
  let hadFullScheduleDay = false;

  // Approved work, grouped by date for best-day + per-category counts.
  const approvedByDate = new Map<string, number>();
  for (const s of approvedSubmissions(state, kidId)) {
    approvedByDate.set(s.date, (approvedByDate.get(s.date) ?? 0) + 1);
    if (s.kind === "mission") {
      totalMissions++;
      const activity = ACTIVITY_BY_ID[s.refId];
      if (activity) categoryCounts[activity.category]++;
    } else {
      totalAssignments++;
    }
  }

  let bestDayCount = 0;
  for (const day of Object.values(kid.history)) {
    totalScheduleBlocks += day.scheduleDone.length;
    if (day.scheduleDone.length >= SCHEDULE.length) hadFullScheduleDay = true;
    const count = day.scheduleDone.length + (approvedByDate.get(day.date) ?? 0);
    if (count > bestDayCount) bestDayCount = count;
  }
  // Days with approved work but no schedule activity also count toward best day.
  for (const [date, n] of approvedByDate) {
    const sched = kid.history[date]?.scheduleDone.length ?? 0;
    if (sched + n > bestDayCount) bestDayCount = sched + n;
  }

  return {
    totalXp: getKidXp(state, kidId),
    totalMissions,
    totalAssignments,
    totalScheduleBlocks,
    categoryCounts,
    streak: computeStreak(state, kidId, today),
    hadFullScheduleDay,
    bestDayCount,
  };
}
