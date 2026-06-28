// ---------------------------------------------------------------------------
// worldBattles — the World's "challenge battle" layer: friendly brain-creatures
// you duel by answering questions. No combat — you solve a creature's puzzles to
// calm and befriend it.
//
// Tier 1 creatures roam the streets from the start. Tier 2 "champion" creatures
// live in the Champions' Ring (south plaza) and unlock at a level; they're harder
// (more puzzles, fewer hearts, advanced questions). The boss (Professor Prism) is
// a co-op daily raid with a shared puzzle meter.
// ---------------------------------------------------------------------------
import type { AcademyQuestion, Subject } from "./academyQuests";
import type { InteractionTarget, Vec3 } from "./worldGame";
import { battleQuestions } from "./battleContent";
import { advancedQuestions, bossQuestions } from "./advancedContent";

export type Creature = {
  id: string;
  name: string;
  emoji: string;
  subject: Subject;
  color: string;
  /** [x, float height, z] — placed on open streets, away from buildings. */
  position: Vec3;
  intro: string;
  winLine: string;
  loseLine: string;
  /** Mistakes the player may make before the battle ends (no harsh fail). */
  hearts: number;
  /** Correct answers needed to befriend the creature (solo). */
  puzzleLength: number;
  tier: 1 | 2;
  /** Player level required to challenge (0 = always available). */
  unlockLevel: number;
  /** Co-op daily-raid boss with a shared meter. */
  boss?: boolean;
  /** Total correct answers (across all raiders) needed to defeat the boss. */
  bossHp?: number;
};

/** The Champions' Ring plaza (tier-2 + boss live here), unlocked at a level. */
export const CHAMPIONS_RING = { x: 0, z: 15.5, radius: 7, unlockLevel: 3 };

export const CREATURES: Creature[] = [
  // --- Tier 1: roaming starters --------------------------------------------
  {
    id: "whisp",
    name: "Whisp",
    emoji: "📖",
    subject: "reading",
    color: "#8b7bf2",
    position: [-16, 1.15, 0],
    intro:
      'A book-sprite flutters down in a shower of glowing letters. "Hihi! I\'m Whisp! Solve my word riddles and we\'ll be friends!"',
    winLine: 'Whisp spins happily, pages glittering. "You read my heart! Friends forever!"',
    loseLine: 'Whisp swirls its pages. "So close! Want to try my riddles again?"',
    hearts: 3,
    puzzleLength: 5,
    tier: 1,
    unlockLevel: 0,
  },
  {
    id: "cog",
    name: "Cog",
    emoji: "⚙️",
    subject: "math",
    color: "#ef8a3a",
    position: [16, 1.15, 0],
    intro:
      'A clinking gear-gremlin rolls up. "Cog\'s the name, number puzzles are my game! Tighten my bolts with the right answers!"',
    winLine: 'Cog whirs and gleams. "Every bolt tight! You\'re my kind of maker — friends!"',
    loseLine: 'Cog\'s gears wobble. "Rusty luck! Spin me up again whenever you like."',
    hearts: 3,
    puzzleLength: 5,
    tier: 1,
    unlockLevel: 0,
  },
  {
    id: "comet",
    name: "Comet",
    emoji: "☄️",
    subject: "science",
    color: "#46b0e8",
    position: [0, 1.15, -16],
    intro:
      'A little star-pup beams down, tail sparkling. "Comet here! Answer my space-and-nature questions and I\'ll wag my tail for you!"',
    winLine: 'Comet\'s tail blazes with happy sparkles. "You\'re a real explorer — friends!"',
    loseLine: 'Comet tilts its head kindly. "The stars are tricky! Call me back for a rematch."',
    hearts: 3,
    puzzleLength: 5,
    tier: 1,
    unlockLevel: 0,
  },
  // --- Tier 2: Champions' Ring (harder, level-gated) -----------------------
  {
    id: "sage-whisp",
    name: "Sage Whisp",
    emoji: "📜",
    subject: "reading",
    color: "#6a4fd0",
    position: [-8, 1.2, 16],
    intro:
      'An elder book-spirit unrolls a glowing scroll. "Greetings, champion. My riddles are deeper now. Show me how far your reading has grown."',
    winLine: 'Sage Whisp bows, scrolls shimmering. "Masterfully read! You are a true Word-Keeper."',
    loseLine: 'Sage Whisp nods gently. "A worthy effort. Return when you are ready, champion."',
    hearts: 2,
    puzzleLength: 7,
    tier: 2,
    unlockLevel: 3,
  },
  {
    id: "mega-cog",
    name: "Mega Cog",
    emoji: "🛠️",
    subject: "math",
    color: "#d8762a",
    position: [8, 1.2, 16],
    intro:
      'A towering gear-titan rumbles to life. "So! You\'ve come for the big machine. These calculations are tougher — prove your mind, maker!"',
    winLine: 'Mega Cog roars with delight. "FLAWLESS! The grand machine runs because of you!"',
    loseLine: 'Mega Cog powers down a notch. "Almost! Recharge and challenge me again."',
    hearts: 2,
    puzzleLength: 7,
    tier: 2,
    unlockLevel: 3,
  },
  {
    id: "astro-comet",
    name: "Astro Comet",
    emoji: "🌟",
    subject: "science",
    color: "#2f93d8",
    position: [0, 1.2, 19],
    intro:
      'A grown star-being glides down, ringed with planets. "Welcome to the deep sky, champion. My science is harder out here. Ready to explore?"',
    winLine: 'Astro Comet blazes like a small sun. "Brilliant! The cosmos salutes a true scientist!"',
    loseLine: 'Astro Comet twinkles kindly. "The far stars are tricky. Come back and reach them!"',
    hearts: 2,
    puzzleLength: 7,
    tier: 2,
    unlockLevel: 3,
  },
  // --- Boss: co-op daily raid ----------------------------------------------
  {
    id: "prism",
    name: "Professor Prism",
    emoji: "🌈",
    subject: "reading", // unused — the boss draws from all advanced pools
    color: "#b154d6",
    position: [0, 1.5, 13],
    intro:
      'A great rainbow owl-prism unfurls, scattering colored light. "Ah, challengers! I am Professor Prism, master of ALL subjects. Defeat me together — every right answer chips my puzzle-shield!"',
    winLine: 'Professor Prism glows in every color and bows. "Magnificent, scholars! The Ring is yours today. Return tomorrow for a new challenge!"',
    loseLine: 'Professor Prism shimmers patiently. "A grand try! My shield holds for now — rally your friends and strike again."',
    hearts: 4,
    puzzleLength: 12,
    tier: 2,
    unlockLevel: 5,
    boss: true,
    bossHp: 12,
  },
];

export function creatureById(id: string): Creature | undefined {
  return CREATURES.find((creature) => creature.id === id);
}

export function bossCreature(): Creature | undefined {
  return CREATURES.find((creature) => creature.boss);
}

export function creatureUnlocked(creature: Creature, level: number): boolean {
  return level >= creature.unlockLevel;
}

export function creatureInteractions(): InteractionTarget[] {
  return CREATURES.map((creature) => ({
    id: creature.id,
    kind: "creature" as const,
    label: creature.boss ? `Raid ${creature.name}` : `Challenge ${creature.name}`,
    position: [creature.position[0], 0, creature.position[2]] as const,
    radius: 2.4,
  }));
}

function poolFor(creature: Creature): AcademyQuestion[] {
  if (creature.boss) return bossQuestions();
  if (creature.tier === 2) return advancedQuestions(creature.subject);
  return battleQuestions(creature.subject);
}

/** Shuffle the creature's pool and draw enough questions for the encounter
 * (repeating only if the pool is smaller than needed). */
export function drawBattleQuestions(creature: Creature): AcademyQuestion[] {
  const count = creature.boss ? (creature.bossHp ?? 12) : creature.puzzleLength;
  const shuffled = [...poolFor(creature)].sort(() => Math.random() - 0.5);
  if (shuffled.length >= count) return shuffled.slice(0, count);
  const out: AcademyQuestion[] = [];
  while (out.length < count) out.push(...shuffled);
  return out.slice(0, count);
}
