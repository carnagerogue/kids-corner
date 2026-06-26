// ---------------------------------------------------------------------------
// AvatarRewardEngine — how learning turns into coins, XP, and unlocks.
//
// NOTE: the app already grants XP/coins when a grown-up APPROVES a submission
// (each Submission carries its own `xp`, and coins = 60 + XP + bonuses − spent).
// This module (a) documents the reward rates for display + parent reference,
// (b) evaluates manifest `unlockRequirement`s against real learning stats so
// mission/streak/trophy cosmetics auto-unlock, and (c) rolls the daily box.
// ---------------------------------------------------------------------------
import type { ActivityCategory, KidStats } from "../../types";
import type { UnlockRequirement } from "./avatarTypes";

/** Reward rates shown to learners + grown-ups (the engine of motivation). */
export const REWARD_RULES: {
  id: string;
  emoji: string;
  label: string;
  xp: number;
  coins: number;
  note?: string;
}[] = [
  { id: "schedule", emoji: "✅", label: "Finish a scheduled task", xp: 10, coins: 5 },
  { id: "education", emoji: "📚", label: "Finish a learning task", xp: 25, coins: 15 },
  { id: "mission", emoji: "🎯", label: "Complete a mission", xp: 40, coins: 25 },
  { id: "fullday", emoji: "🌟", label: "Finish your whole day", xp: 100, coins: 75 },
  { id: "streak3", emoji: "🔥", label: "3-day streak", xp: 0, coins: 100, note: "Bonus coins!" },
  { id: "streak7", emoji: "🎁", label: "7-day streak", xp: 0, coins: 0, note: "Mystery box + Champion outfit!" },
  { id: "trophy", emoji: "🏆", label: "Earn a trophy", xp: 0, coins: 0, note: "Unlocks a special cosmetic" },
];

/** Does a learner meet an item's unlock requirement? */
export function meetsUnlock(
  req: UnlockRequirement | undefined,
  stats: KidStats,
  level: number,
  badges: string[],
): boolean {
  if (!req) return false;
  switch (req.type) {
    case "completeMissionCategory":
      return (
        (stats.categoryCounts[req.category as ActivityCategory] ?? 0) >= req.count
      );
    case "streak":
      return stats.streak >= req.days;
    case "totalApproved":
      return stats.totalMissions + stats.totalAssignments >= req.count;
    case "level":
      return level >= req.level;
    case "trophy":
      return badges.includes(req.badgeId);
    default:
      return false;
  }
}

/** Current progress toward an unlock, for a "3 / 5 missions" style hint. */
export function unlockProgress(
  req: UnlockRequirement | undefined,
  stats: KidStats,
  level: number,
): { current: number; target: number } | null {
  if (!req) return null;
  switch (req.type) {
    case "completeMissionCategory":
      return {
        current: stats.categoryCounts[req.category as ActivityCategory] ?? 0,
        target: req.count,
      };
    case "streak":
      return { current: stats.streak, target: req.days };
    case "totalApproved":
      return {
        current: stats.totalMissions + stats.totalAssignments,
        target: req.count,
      };
    case "level":
      return { current: level, target: req.level };
    default:
      return null;
  }
}

/** Short human label for a locked item's requirement (shop card). */
export function unlockLabel(req: UnlockRequirement | undefined): string {
  if (!req) return "Locked";
  switch (req.type) {
    case "completeMissionCategory": {
      const nice: Partial<Record<ActivityCategory, string>> = {
        "brain-games": "brain-game",
        drawing: "art",
        writing: "reading & writing",
        science: "science",
        outdoor: "outdoor",
      };
      const word = nice[req.category as ActivityCategory] ?? req.category;
      return `Do ${req.count} ${word} missions`;
    }
    case "streak":
      return `Reach a ${req.days}-day streak`;
    case "totalApproved":
      return `Finish ${req.count} tasks`;
    case "level":
      return `Reach level ${req.level}`;
    case "trophy":
      return "Earn a special trophy";
    default:
      return "Locked";
  }
}

// --- Daily Mystery Box ------------------------------------------------------

export type BoxReward = {
  kind: "coins" | "item" | "xpboost";
  coins: number;
  itemId?: string;
  emoji: string;
  label: string;
};

/** Cheap, fun items the daily box can award (kept affordable on purpose). */
export const BOX_ITEM_POOL = [
  "beanie",
  "ball-cap",
  "story-book",
  "paintbrush",
  "boots",
  "round-glasses",
  "sparkle-aura",
  "bunny",
];

/**
 * Roll a daily-box reward. Mostly coins, sometimes a surprise item the learner
 * doesn't already own. `ownedIds` avoids handing out duplicates.
 */
export function rollDailyBox(ownedIds: string[]): BoxReward {
  const roll = Math.random();
  // ~30% chance of a surprise item (if any fresh ones remain).
  const fresh = BOX_ITEM_POOL.filter((id) => !ownedIds.includes(id));
  if (roll < 0.3 && fresh.length) {
    const itemId = fresh[Math.floor(Math.random() * fresh.length)];
    return {
      kind: "item",
      coins: 0,
      itemId,
      emoji: "🎁",
      label: "A surprise item!",
    };
  }
  if (roll < 0.4) {
    return { kind: "xpboost", coins: 50, emoji: "⚡", label: "XP Boost — 50 coins!" };
  }
  // Coins, weighted toward small amounts.
  const tiers = [
    { coins: 15, emoji: "🪙", label: "15 coins" },
    { coins: 25, emoji: "🪙", label: "25 coins" },
    { coins: 40, emoji: "💰", label: "40 coins" },
    { coins: 75, emoji: "💎", label: "75 coins — lucky!" },
  ];
  const weights = [0.45, 0.3, 0.18, 0.07];
  let r = Math.random();
  for (let i = 0; i < tiers.length; i++) {
    if (r < weights[i]) return { kind: "coins", ...tiers[i] };
    r -= weights[i];
  }
  return { kind: "coins", ...tiers[0] };
}
