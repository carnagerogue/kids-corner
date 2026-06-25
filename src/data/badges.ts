import type { Badge } from "../types";

// Badges are checked against a kid's derived KidStats. Once earned they stick.
export const BADGES: Badge[] = [
  {
    id: "first-mission",
    title: "Lift Off",
    emoji: "🚀",
    description: "Complete your very first mission.",
    earned: (s) => s.totalMissions >= 1,
  },
  {
    id: "mission-master",
    title: "Mission Master",
    emoji: "🎖️",
    description: "Complete 10 missions in all.",
    earned: (s) => s.totalMissions >= 10,
  },
  {
    id: "mission-legend",
    title: "Mission Legend",
    emoji: "👑",
    description: "Complete 25 missions in all.",
    earned: (s) => s.totalMissions >= 25,
  },
  {
    id: "artist",
    title: "Master Artist",
    emoji: "🎨",
    description: "Finish 3 arts, crafts, or drawing missions.",
    earned: (s) =>
      s.categoryCounts["arts-crafts"] + s.categoryCounts["drawing"] >= 3,
  },
  {
    id: "scientist",
    title: "Mad Scientist",
    emoji: "🔬",
    description: "Finish 3 science missions.",
    earned: (s) => s.categoryCounts["science"] >= 3,
  },
  {
    id: "builder",
    title: "Master Builder",
    emoji: "🧱",
    description: "Finish 3 building missions.",
    earned: (s) => s.categoryCounts["building"] >= 3,
  },
  {
    id: "explorer",
    title: "Outdoor Explorer",
    emoji: "🌳",
    description: "Finish 3 outdoor missions.",
    earned: (s) => s.categoryCounts["outdoor"] >= 3,
  },
  {
    id: "wordsmith",
    title: "Wordsmith",
    emoji: "✍️",
    description: "Finish 3 writing missions.",
    earned: (s) => s.categoryCounts["writing"] >= 3,
  },
  {
    id: "kind-heart",
    title: "Kind Heart",
    emoji: "💛",
    description: "Complete a kindness mission.",
    earned: (s) => s.categoryCounts["kindness"] >= 1,
  },
  {
    id: "super-helper",
    title: "Super Helper",
    emoji: "🧹",
    description: "Finish 3 chore missions.",
    earned: (s) => s.categoryCounts["chores"] >= 3,
  },
  {
    id: "scholar",
    title: "Scholar",
    emoji: "🎓",
    description: "Get 5 daily assignments approved.",
    earned: (s) => s.totalAssignments >= 5,
  },
  {
    id: "full-day",
    title: "Perfect Day",
    emoji: "📅",
    description: "Complete every schedule block in one day.",
    earned: (s) => s.hadFullScheduleDay,
  },
  {
    id: "busy-bee",
    title: "Busy Bee",
    emoji: "🐝",
    description: "Finish 6 things in a single day.",
    earned: (s) => s.bestDayCount >= 6,
  },
  {
    id: "streak-3",
    title: "On a Roll",
    emoji: "🔥",
    description: "Keep a 3-day streak going.",
    earned: (s) => s.streak >= 3,
  },
  {
    id: "streak-7",
    title: "Week Warrior",
    emoji: "⚡",
    description: "Keep a 7-day streak going.",
    earned: (s) => s.streak >= 7,
  },
  {
    id: "xp-500",
    title: "XP Powerhouse",
    emoji: "💪",
    description: "Earn 500 total XP.",
    earned: (s) => s.totalXp >= 500,
  },
];

export const BADGE_BY_ID: Record<string, Badge> = Object.fromEntries(
  BADGES.map((b) => [b.id, b]),
);
