import type {
  ActivityCategory,
  ActivityIdea,
  AppState,
  AvatarConfig,
  ChoreAssignment,
  DayProgress,
  Kid,
  KidId,
  KidStats,
  Message,
  ParticipantId,
  ScheduleBlock,
  SchedulePlan,
  Submission,
  SubmissionStatus,
} from "../types";
import { ACTIVITY_BY_ID, CATEGORY_ORDER, CHORES } from "../data/activities";
import { APP_CATALOG, type CatalogApp } from "../data/applications";
import { RESOURCES, type Resource } from "../data/resources";
import { defaultSchedules } from "../data/schedule";
import {
  GEAR_BY_ID,
  STARTER_COINS,
  defaultAvatarConfig,
} from "../data/avatar";
import { todayKey } from "./storage";

// --- Kid roster -----------------------------------------------------------

const FALLBACK_KID = (id: KidId): Kid => ({
  id,
  name: "Kid",
  firstName: "Kid",
  emoji: "🙂",
  color: "#8a8a8a",
  colorDark: "#5a5a5a",
  colorSoft: "#ededed",
  motto: "",
});

/** The current roster, in display order. */
export function kidList(state: AppState): Kid[] {
  return state.kidProfiles;
}

/** Look up a kid by id; returns a safe placeholder if it was removed. */
export function getKid(state: AppState, id: KidId): Kid {
  return state.kidProfiles.find((k) => k.id === id) ?? FALLBACK_KID(id);
}

// --- Activities (catalog + grown-up custom) -------------------------------

/** Look up an activity by id across the built-in catalog and custom ones. */
export function activityById(
  state: AppState,
  id: string,
): ActivityIdea | undefined {
  return ACTIVITY_BY_ID[id] ?? state.customActivities?.find((a) => a.id === id);
}

/** Built-in + grown-up-created chores, for the assign-chore picker. */
export function choreCatalog(state: AppState): ActivityIdea[] {
  const custom = (state.customActivities ?? []).filter(
    (a) => a.category === "chores",
  );
  return [...CHORES, ...custom];
}

/** The example image a grown-up attached to an activity, if any. */
export function activityImage(state: AppState, id: string): string | undefined {
  return state.activityImages?.[id];
}

// --- App visibility -------------------------------------------------------

/** The catalog apps a kid is allowed to see, in catalog order. */
export function visibleAppsFor(state: AppState, kidId: KidId): CatalogApp[] {
  const vis = state.appVisibility[kidId] ?? [];
  return APP_CATALOG.filter((a) => vis.includes(a.id));
}

/** A kid's main platform (first visible primary app, else first visible). */
export function primaryAppFor(
  state: AppState,
  kidId: KidId,
): CatalogApp | undefined {
  const apps = visibleAppsFor(state, kidId);
  return apps.find((a) => a.primary) ?? apps[0];
}

/** Explore resources a kid can see (all except the ones a grown-up hid). */
export function visibleResourcesFor(state: AppState, kidId: KidId): Resource[] {
  const hidden = state.exploreHidden[kidId] ?? [];
  return hidden.length
    ? RESOURCES.filter((r) => !hidden.includes(r.id))
    : RESOURCES;
}

// --- Schedules ------------------------------------------------------------

/** Every schedule plan, with a safe default if state predates the feature. */
export function allPlans(state: AppState): SchedulePlan[] {
  return state.schedules?.length ? state.schedules : defaultSchedules();
}

/** The family plan everyone follows by default. */
export function familyPlan(state: AppState): SchedulePlan {
  const plans = allPlans(state);
  return plans.find((p) => p.scope.kind === "family") ?? plans[0];
}

/** Custom (kids-scoped) plans, in definition order. */
export function customPlans(state: AppState): SchedulePlan[] {
  return allPlans(state).filter((p) => p.scope.kind === "kids");
}

/** The plan a kid actually follows: their custom plan if any, else family. */
export function planForKid(state: AppState, kidId: KidId): SchedulePlan {
  const custom = customPlans(state).find(
    (p) =>
      p.scope.kind === "kids" &&
      Array.isArray(p.scope.kidIds) &&
      p.scope.kidIds.includes(kidId) &&
      Array.isArray(p.blocks) &&
      p.blocks.length > 0,
  );
  return custom ?? familyPlan(state);
}

/** The schedule blocks a kid sees today. */
export function effectiveSchedule(state: AppState, kidId: KidId): ScheduleBlock[] {
  return planForKid(state, kidId).blocks;
}

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

// --- Avatar coins & gear --------------------------------------------------

/** Coins earned over all time: starter grant + XP from approved work + spin
 * bonuses. */
export function coinsEarned(state: AppState, kidId: KidId): number {
  return (
    STARTER_COINS + getKidXp(state, kidId) + (state.coinsBonus?.[kidId] ?? 0)
  );
}

/** Is the kid's free daily mystery-box spin available? */
export function canSpinFree(state: AppState, kidId: KidId): boolean {
  return (state.lastSpin?.[kidId] ?? "") !== todayKey();
}

/** Spendable coin balance (earned minus what's been spent in the shop). */
export function coinBalance(state: AppState, kidId: KidId): number {
  return Math.max(0, coinsEarned(state, kidId) - (state.coinsSpent?.[kidId] ?? 0));
}

/** Has this kid unlocked a gear item? (Free defaults are always owned.) */
export function ownsGear(state: AppState, kidId: KidId, gearId: string): boolean {
  const item = GEAR_BY_ID[gearId];
  if (!item) return false;
  if (item.price === 0) return true;
  return (state.ownedGear?.[kidId] ?? []).includes(gearId);
}

/** The kid's equipped gear, defaults filling empty slots. Saved ids that
 * aren't valid for the current catalog (e.g. from an older avatar version)
 * are ignored so the premium defaults still show. */
export function equippedAvatar(state: AppState, kidId: KidId): AvatarConfig {
  const out: AvatarConfig = { ...defaultAvatarConfig() };
  const saved = state.avatar?.[kidId] ?? {};
  for (const key of Object.keys(saved) as (keyof AvatarConfig)[]) {
    const id = saved[key];
    const gear = id ? GEAR_BY_ID[id] : undefined;
    if (gear && gear.slot === key) out[key] = id;
  }
  return out;
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

/** The conversation between two participants, oldest first. */
export function messagesBetween(
  state: AppState,
  a: ParticipantId,
  b: ParticipantId,
): Message[] {
  return state.messages
    .filter(
      (m) => (m.from === a && m.to === b) || (m.from === b && m.to === a),
    )
    .sort((x, y) => x.at - y.at);
}

/** Unread messages addressed to `me` (optionally only from a given sender). */
export function unreadFor(
  state: AppState,
  me: ParticipantId,
  from?: ParticipantId,
): number {
  return state.messages.reduce((n, m) => {
    if (m.to !== me || m.read) return n;
    if (from && m.from !== from) return n;
    return n + 1;
  }, 0);
}

/** Total unread messages for a kid (from the grown-ups or other kids). */
export function kidUnreadCount(state: AppState, kidId: KidId): number {
  return unreadFor(state, kidId);
}

/** Unread messages waiting for the grown-ups (optionally from one kid). */
export function parentUnreadCount(state: AppState, kidId?: KidId): number {
  return unreadFor(state, "parent", kidId);
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

  // One "freeze" forgives a single missed day so a streak survives an off day.
  let streak = 0;
  let graceUsed = false;
  for (let i = 0; i < 400; i++) {
    const key = isoKey(cursor);
    if (activeOn(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (!graceUsed && streak > 0) {
      graceUsed = true; // skip this gap day, keep the streak alive
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// --- Daily goal -----------------------------------------------------------

/** How many tasks a kid aims to finish each day. */
export const DAILY_GOAL = 3;

/** Approved tasks the kid finished on a given day (the daily-goal progress). */
export function dailyGoalDone(
  state: AppState,
  kidId: KidId,
  date: string = todayKey(),
): number {
  return approvedSubmissions(state, kidId).filter((s) => s.date === date).length;
}

/** Has the kid hit today's goal? */
export function dailyGoalMet(
  state: AppState,
  kidId: KidId,
  date: string = todayKey(),
): boolean {
  return dailyGoalDone(state, kidId, date) >= DAILY_GOAL;
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

  const scheduleLen = effectiveSchedule(state, kidId).length;
  let bestDayCount = 0;
  for (const day of Object.values(kid.history)) {
    totalScheduleBlocks += day.scheduleDone.length;
    if (scheduleLen > 0 && day.scheduleDone.length >= scheduleLen)
      hadFullScheduleDay = true;
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
