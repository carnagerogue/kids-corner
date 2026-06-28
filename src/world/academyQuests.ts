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

export type AcademyProgress = {
  version: 1;
  xp: number;
  /** chapters fully completed per quest (0..chapters.length). */
  chaptersDone: Partial<Record<AcademyQuestId, number>>;
  /** lifetime correct answers (for badges / stats). */
  correct: number;
  /** ids of challenge-battle creatures the learner has befriended. */
  befriended: string[];
};

export const XP_PER_CORRECT = 10;
export const XP_PER_CHAPTER = 20;
export const XP_PER_BATTLE_WIN = 30;

const DEFAULT_PROGRESS: AcademyProgress = {
  version: 1,
  xp: 0,
  chaptersDone: {},
  correct: 0,
  befriended: [],
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
