// ---------------------------------------------------------------------------
// achievements — milestone badges earned from World progress. Each is a pure
// predicate over the learner's AcademyProgress + WorldSave, so "earned" is
// always derivable; WorldView also persists the earned set so it can pop a
// one-time "unlocked!" toast.
// ---------------------------------------------------------------------------
import type { AcademyProgress } from "./academyQuests";
import { academyById, levelForXp } from "./academyQuests";
import { CREATURES } from "./worldBattles";
import { LANDMARKS, type WorldSave } from "./worldGame";

export type Achievement = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  check: (academy: AcademyProgress, world: WorldSave) => boolean;
};

const questDone = (a: AcademyProgress, id: "story-grove" | "maker-yard" | "sky-lab") => {
  const quest = academyById(id);
  return quest ? (a.chaptersDone[id] ?? 0) >= quest.chapters.length : false;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-steps", emoji: "👣", name: "First Steps", description: "Answer your very first question.", check: (a) => a.correct >= 1 },
  { id: "curious", emoji: "❓", name: "Curious Mind", description: "Answer 25 questions correctly.", check: (a) => a.correct >= 25 },
  { id: "quiz-master", emoji: "🧠", name: "Quiz Master", description: "Answer 75 questions correctly.", check: (a) => a.correct >= 75 },
  { id: "bookworm", emoji: "📚", name: "Bookworm", description: "Finish the Story Grove reading quest.", check: (a) => questDone(a, "story-grove") },
  { id: "number-cruncher", emoji: "🔢", name: "Number Cruncher", description: "Finish the Maker Yard math quest.", check: (a) => questDone(a, "maker-yard") },
  { id: "stargazer", emoji: "🔭", name: "Stargazer", description: "Finish the Sky Lab science quest.", check: (a) => questDone(a, "sky-lab") },
  { id: "triple-scholar", emoji: "🎓", name: "Triple Scholar", description: "Finish all three Academy quests.", check: (a) => questDone(a, "story-grove") && questDone(a, "maker-yard") && questDone(a, "sky-lab") },
  { id: "friend", emoji: "💚", name: "Creature Friend", description: "Befriend your first creature.", check: (a) => a.befriended.length >= 1 },
  { id: "tamer", emoji: "🤝", name: "Monster Tamer", description: "Befriend all six creatures.", check: (a) => { const ids = new Set(a.befriended); return CREATURES.filter((c) => !c.boss).every((c) => ids.has(c.id)); } },
  { id: "boss-slayer", emoji: "🌈", name: "Boss Slayer", description: "Win a Professor Prism raid.", check: (a) => a.bossWins >= 1 },
  { id: "rising-star", emoji: "⭐", name: "Rising Star", description: "Reach Level 3.", check: (a) => levelForXp(a.xp) >= 3 },
  { id: "champion", emoji: "👑", name: "Champion", description: "Reach Level 6.", check: (a) => levelForXp(a.xp) >= 6 },
  { id: "on-fire", emoji: "🔥", name: "On Fire", description: "Reach a 3-day daily streak.", check: (a) => a.streak >= 3 },
  { id: "dedicated", emoji: "📅", name: "Dedicated", description: "Reach a 7-day daily streak.", check: (a) => a.streak >= 7 },
  { id: "stylish", emoji: "✨", name: "Stylish", description: "Own three auras from the shop.", check: (a) => a.ownedAuras.length >= 3 },
  { id: "town-hero", emoji: "🏛️", name: "Town Hero", description: "Power all three landmark lights.", check: (_a, w) => w.activatedLandmarks.length >= LANDMARKS.length },
];

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Ids of every achievement currently satisfied by the given progress. */
export function earnedAchievements(academy: AcademyProgress, world: WorldSave): string[] {
  return ACHIEVEMENTS.filter((a) => a.check(academy, world)).map((a) => a.id);
}
