import type { Rank } from "../types";

// Fun summer ranks. minXp is the total XP needed to reach each level.
export const RANKS: Rank[] = [
  { level: 1, title: "Sprout", emoji: "🌱", minXp: 0 },
  { level: 2, title: "Explorer", emoji: "🧭", minXp: 100 },
  { level: 3, title: "Adventurer", emoji: "🚀", minXp: 250 },
  { level: 4, title: "Trailblazer", emoji: "🔥", minXp: 450 },
  { level: 5, title: "Champion", emoji: "🏆", minXp: 700 },
  { level: 6, title: "Legend", emoji: "🌟", minXp: 1000 },
  { level: 7, title: "Summer Hero", emoji: "🦸", minXp: 1400 },
];

export type LevelInfo = {
  rank: Rank;
  next: Rank | null;
  /** XP earned within the current level */
  xpIntoLevel: number;
  /** XP span of the current level (Infinity at max) */
  xpForLevel: number;
  /** 0..1 progress toward the next level (1 at max) */
  progress: number;
};

export function getLevelInfo(totalXp: number): LevelInfo {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (totalXp >= r.minXp) rank = r;
  }
  const next = RANKS.find((r) => r.level === rank.level + 1) ?? null;

  if (!next) {
    return {
      rank,
      next: null,
      xpIntoLevel: totalXp - rank.minXp,
      xpForLevel: Infinity,
      progress: 1,
    };
  }

  const xpForLevel = next.minXp - rank.minXp;
  const xpIntoLevel = totalXp - rank.minXp;
  return {
    rank,
    next,
    xpIntoLevel,
    xpForLevel,
    progress: Math.min(1, xpIntoLevel / xpForLevel),
  };
}
