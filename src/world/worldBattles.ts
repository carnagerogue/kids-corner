// ---------------------------------------------------------------------------
// worldBattles — the World's "challenge battle" layer: friendly brain-creatures
// you duel by answering questions. No combat — you solve a creature's puzzles to
// calm and befriend it. Winning earns XP + tokens and adds the creature to your
// Brain Buddies collection. Creatures are replayable for more XP.
// ---------------------------------------------------------------------------
import type { AcademyQuestion, Subject } from "./academyQuests";
import type { InteractionTarget, Vec3 } from "./worldGame";
import { battleQuestions } from "./battleContent";

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
  /** Correct answers needed to befriend the creature. */
  puzzleLength: number;
};

export const CREATURES: Creature[] = [
  {
    id: "whisp",
    name: "Whisp",
    emoji: "📖",
    subject: "reading",
    color: "#8b7bf2",
    position: [-16, 1.15, 0],
    intro:
      'A book-sprite flutters down in a shower of glowing letters. "Hihi! I\'m Whisp! Solve my word riddles and we\'ll be friends!"',
    winLine:
      'Whisp spins happily, pages glittering. "You read my heart! Friends forever!"',
    loseLine:
      'Whisp swirls its pages. "So close! Want to try my riddles again?"',
    hearts: 3,
    puzzleLength: 5,
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
    winLine:
      'Cog whirs and gleams. "Every bolt tight! You\'re my kind of maker — friends!"',
    loseLine:
      'Cog\'s gears wobble. "Rusty luck! Spin me up again whenever you like."',
    hearts: 3,
    puzzleLength: 5,
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
    winLine:
      'Comet\'s tail blazes with happy sparkles. "You\'re a real explorer — friends!"',
    loseLine:
      'Comet tilts its head kindly. "The stars are tricky! Call me back for a rematch."',
    hearts: 3,
    puzzleLength: 5,
  },
];

export function creatureById(id: string): Creature | undefined {
  return CREATURES.find((creature) => creature.id === id);
}

export function creatureInteractions(): InteractionTarget[] {
  return CREATURES.map((creature) => ({
    id: creature.id,
    kind: "creature" as const,
    label: `Challenge ${creature.name}`,
    position: [creature.position[0], 0, creature.position[2]] as const,
    radius: 2.3,
  }));
}

/** Shuffle the creature's subject pool and draw `puzzleLength` questions
 * (repeating only if the pool is smaller than the battle length). */
export function drawBattleQuestions(creature: Creature): AcademyQuestion[] {
  const shuffled = [...battleQuestions(creature.subject)].sort(
    () => Math.random() - 0.5,
  );
  if (shuffled.length >= creature.puzzleLength) {
    return shuffled.slice(0, creature.puzzleLength);
  }
  const out: AcademyQuestion[] = [];
  while (out.length < creature.puzzleLength) out.push(...shuffled);
  return out.slice(0, creature.puzzleLength);
}
