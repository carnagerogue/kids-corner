// ---------------------------------------------------------------------------
// academyQuests — the educational "quest chain" layer for the World.
//
// Each of the three landmarks is an Academy run by an NPC quest-giver:
//   📚 Story Grove  → Sage the Story Keeper   (reading / language)
//   🛠️ Maker Yard   → Gizmo the Maker         (math)
//   🔭 Sky Lab      → Dr. Lux the Stargazer    (science)
//
// A quest is a chain of story chapters; each chapter poses a few multiple-choice
// learning challenges. Answering correctly earns XP (player levels up) and town
// tokens. Progress persists per-kid in its OWN localStorage slice so it never
// disturbs worldGame's save schema. Quest CONTENT lives in academyContent.ts.
// ---------------------------------------------------------------------------
import type { KidId } from "../types";
import type { LandmarkId } from "./worldGame";

// Academy ids deliberately equal the LandmarkId union so the existing landmark
// positions / festival lights double as the quest-giver locations.
export type AcademyQuestId = LandmarkId; // "story-grove" | "maker-yard" | "sky-lab"
export type Subject = "reading" | "math" | "science";

export type AcademyQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  /** Index into `choices` of the one correct answer. */
  answer: number;
  hint: string;
  explain: string;
};

export type AcademyChapter = {
  id: string;
  title: string;
  intro: string;
  rewardTokens: number;
  questions: AcademyQuestion[];
};

export type AcademyQuest = {
  questId: AcademyQuestId;
  subject: Subject;
  giver: string;
  emoji: string;
  title: string;
  blurb: string;
  chapters: AcademyChapter[];
};

// --- Progression model ------------------------------------------------------

export type DailyState = { date: string; progress: number; claimed: boolean };

export type AcademyProgress = {
  version: 1;
  xp: number;
  /** chapters fully completed per quest (0..chapters.length). */
  chaptersDone: Partial<Record<AcademyQuestId, number>>;
  /** lifetime correct answers (for badges / stats). */
  correct: number;
  /** ids of challenge-battle creatures the learner has befriended. */
  befriended: string[];
  /** today's daily-quest progress (resets when the date rolls over). */
  daily: DailyState;
  /** lifetime co-op boss raids completed. */
  bossWins: number;
};

export const XP_PER_CORRECT = 10;
export const XP_PER_CHAPTER = 20;
export const XP_PER_BATTLE_WIN = 30;
export const XP_PER_BOSS_WIN = 50;
export const XP_PER_DAILY = 25;

const DEFAULT_PROGRESS: AcademyProgress = {
  version: 1,
  xp: 0,
  chaptersDone: {},
  correct: 0,
  befriended: [],
  daily: { date: "", progress: 0, claimed: false },
  bossWins: 0,
};

const LEVEL_XP = 100; // xp per level — full quest line ≈ level 6-7

/** 1-based level for a given total XP. */
export function levelForXp(xp: number): number {
  return Math.floor(Math.max(0, xp) / LEVEL_XP) + 1;
}

/** XP earned inside the current level, and XP needed to fill the level bar. */
export function levelBar(xp: number): { into: number; span: number; pct: number } {
  const into = Math.max(0, xp) % LEVEL_XP;
  return { into, span: LEVEL_XP, pct: Math.round((into / LEVEL_XP) * 100) };
}

const LEVEL_TITLES = [
  "Explorer", // 1
  "Scout", // 2
  "Apprentice", // 3
  "Scholar", // 4
  "Adventurer", // 5
  "Champion", // 6
];
export function levelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length) - 1] ?? "Master";
}

// --- Pure progress transitions ----------------------------------------------

/** Record one correct answer: +XP, +1 correct. Returns a NEW progress object. */
export function recordCorrect(p: AcademyProgress): AcademyProgress {
  return { ...p, xp: p.xp + XP_PER_CORRECT, correct: p.correct + 1 };
}

/** Number of chapters finished for a quest (clamped, missing → 0). */
export function chaptersDone(p: AcademyProgress, questId: AcademyQuestId): number {
  return Math.max(0, p.chaptersDone[questId] ?? 0);
}

/** Index of the chapter the learner should play next (=== chapters.length when done). */
export function currentChapterIndex(
  p: AcademyProgress,
  quest: AcademyQuest,
): number {
  return Math.min(chaptersDone(p, quest.questId), quest.chapters.length);
}

export function isQuestComplete(p: AcademyProgress, quest: AcademyQuest): boolean {
  return chaptersDone(p, quest.questId) >= quest.chapters.length;
}

export type QuestStatus = "not-started" | "in-progress" | "complete";
export function questStatus(p: AcademyProgress, quest: AcademyQuest): QuestStatus {
  const done = chaptersDone(p, quest.questId);
  if (done <= 0) return "not-started";
  if (done >= quest.chapters.length) return "complete";
  return "in-progress";
}

/**
 * Mark the next chapter of a quest complete (idempotent guard against skips):
 * advances chaptersDone by one (only if `chapterIndex` is the expected next one)
 * and awards the chapter XP bonus. Returns { progress, firstForQuest } so the
 * caller can light the landmark the first time a quest is touched.
 */
export function completeChapter(
  p: AcademyProgress,
  quest: AcademyQuest,
  chapterIndex: number,
): { progress: AcademyProgress; firstForQuest: boolean } {
  const done = chaptersDone(p, quest.questId);
  // Only advance if they just finished the expected next chapter.
  if (chapterIndex !== done || done >= quest.chapters.length) {
    return { progress: p, firstForQuest: false };
  }
  return {
    progress: {
      ...p,
      xp: p.xp + XP_PER_CHAPTER,
      chaptersDone: { ...p.chaptersDone, [quest.questId]: done + 1 },
    },
    firstForQuest: done === 0,
  };
}

// --- Challenge battles ------------------------------------------------------

export function isBefriended(p: AcademyProgress, creatureId: string): boolean {
  return p.befriended.includes(creatureId);
}

export function befriendedCount(p: AcademyProgress): number {
  return p.befriended.length;
}

/** Win a battle: award the win bonus (every time — battles are replayable) and
 * add the creature to the collection the first time. */
export function befriend(p: AcademyProgress, creatureId: string): AcademyProgress {
  const already = p.befriended.includes(creatureId);
  return {
    ...p,
    xp: p.xp + XP_PER_BATTLE_WIN,
    befriended: already ? p.befriended : [...p.befriended, creatureId],
  };
}

/** Boss raids are co-op: each completion bumps a lifetime count + big XP. */
export function recordBossWin(p: AcademyProgress): AcademyProgress {
  return { ...p, xp: p.xp + XP_PER_BOSS_WIN, bossWins: p.bossWins + 1 };
}

// --- Daily quest ------------------------------------------------------------

export type DailyKind = "correct" | "battle-win" | "chapter";
export type DailyQuestDef = {
  id: string;
  label: string;
  emoji: string;
  goal: number;
  kind: DailyKind;
};

export const DAILY_QUESTS: DailyQuestDef[] = [
  { id: "answer-7", label: "Answer 7 questions correctly", emoji: "🎯", goal: 7, kind: "correct" },
  { id: "win-battle", label: "Win a creature battle", emoji: "⚔️", goal: 1, kind: "battle-win" },
  { id: "finish-chapter", label: "Finish a story chapter", emoji: "📖", goal: 1, kind: "chapter" },
  { id: "answer-12", label: "Answer 12 questions correctly", emoji: "🌟", goal: 12, kind: "correct" },
  { id: "win-2-battles", label: "Win 2 creature battles", emoji: "🏆", goal: 2, kind: "battle-win" },
];

/** Local YYYY-MM-DD for the given date (defaults to now). */
export function todayStr(date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Deterministic daily quest for a date (rotates so every kid gets the same one). */
export function dailyQuestFor(dateStr: string): DailyQuestDef {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0;
  return DAILY_QUESTS[h % DAILY_QUESTS.length];
}

export type DailyView = {
  quest: DailyQuestDef;
  progress: number;
  claimed: boolean;
  complete: boolean;
};

/** Today's quest + progress for display (a stale stored day reads as 0/unclaimed). */
export function dailyView(p: AcademyProgress, dateStr: string): DailyView {
  const quest = dailyQuestFor(dateStr);
  const fresh = p.daily.date === dateStr;
  const progress = fresh ? Math.min(quest.goal, p.daily.progress) : 0;
  const claimed = fresh ? p.daily.claimed : false;
  return { quest, progress, claimed, complete: progress >= quest.goal };
}

/** Advance today's daily quest when a matching event happens (rolls the day over
 * first). Returns the same object when nothing changed. */
export function recordDailyEvent(
  p: AcademyProgress,
  kind: DailyKind,
  amount: number,
  dateStr: string,
): AcademyProgress {
  const rolled =
    p.daily.date === dateStr
      ? p
      : { ...p, daily: { date: dateStr, progress: 0, claimed: false } };
  const quest = dailyQuestFor(dateStr);
  if (quest.kind !== kind || rolled.daily.claimed) return rolled;
  const progress = Math.min(quest.goal, rolled.daily.progress + amount);
  if (progress === rolled.daily.progress) return rolled;
  return { ...rolled, daily: { ...rolled.daily, progress } };
}

export function dailyClaimable(p: AcademyProgress, dateStr: string): boolean {
  const view = dailyView(p, dateStr);
  return view.complete && !view.claimed;
}

/** Claim today's reward (XP here; the caller adds tokens to the world save). */
export function claimDaily(p: AcademyProgress, dateStr: string): AcademyProgress {
  if (!dailyClaimable(p, dateStr)) return p;
  return {
    ...p,
    xp: p.xp + XP_PER_DAILY,
    daily: { date: dateStr, progress: p.daily.progress, claimed: true },
  };
}

// --- Persistence (own slice, never touches worldGame's save) ----------------

const key = (kidId: KidId) => `kids-corner:academy:${kidId}:v1`;

export function loadAcademy(kidId: KidId): AcademyProgress {
  try {
    const raw = localStorage.getItem(key(kidId));
    if (!raw) return structuredClone(DEFAULT_PROGRESS);
    const value = JSON.parse(raw) as Partial<AcademyProgress>;
    return {
      ...structuredClone(DEFAULT_PROGRESS),
      ...value,
      version: 1,
      chaptersDone: { ...(value.chaptersDone ?? {}) },
      befriended: Array.isArray(value.befriended) ? value.befriended : [],
      daily:
        value.daily && typeof value.daily.date === "string"
          ? {
              date: value.daily.date,
              progress: Math.max(0, value.daily.progress ?? 0),
              claimed: !!value.daily.claimed,
            }
          : { date: "", progress: 0, claimed: false },
      bossWins: typeof value.bossWins === "number" && value.bossWins >= 0 ? value.bossWins : 0,
      xp: typeof value.xp === "number" && value.xp >= 0 ? value.xp : 0,
      correct: typeof value.correct === "number" && value.correct >= 0 ? value.correct : 0,
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESS);
  }
}

export function saveAcademy(kidId: KidId, p: AcademyProgress): void {
  try {
    localStorage.setItem(key(kidId), JSON.stringify(p));
  } catch {
    // Private mode / storage full: the in-memory session still works.
  }
}

// Single import surface for the UI.
export { ACADEMY_QUESTS, academyById } from "./academyContent";
