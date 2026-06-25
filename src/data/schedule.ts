import type { ScheduleBlock } from "../types";

// The daily rhythm from the family calendar. Times are stored as minutes from
// midnight so we can highlight whatever block is happening right now.
export const SCHEDULE: ScheduleBlock[] = [
  {
    id: "breakfast",
    title: "Get Ready · Breakfast",
    time: "8:30 – 9:30am",
    startMinutes: 8 * 60 + 30,
    endMinutes: 9 * 60 + 30,
    emoji: "🥣",
    accent: "#ff8a3d",
    xp: 10,
    note: "Brush teeth, get dressed, fuel up for the day.",
  },
  {
    id: "study",
    title: "Study Time",
    time: "9:30 – 10:30am",
    startMinutes: 9 * 60 + 30,
    endMinutes: 10 * 60 + 30,
    emoji: "📚",
    accent: "#3b82f6",
    xp: 15,
    note: "Open your Applications page and do today's assignment.",
    opensApplications: true,
  },
  {
    id: "recess",
    title: "Recess",
    time: "10:30am",
    startMinutes: 10 * 60 + 30,
    endMinutes: 11 * 60,
    emoji: "🤸",
    accent: "#22c55e",
    xp: 5,
    note: "Move your body! Run, jump, stretch.",
  },
  {
    id: "choice-studio",
    title: "Choice Studio",
    time: "11am – 12pm",
    startMinutes: 11 * 60,
    endMinutes: 12 * 60,
    emoji: "🎨",
    accent: "#a855f7",
    xp: 15,
    note: "Pick a creative or building mission you love.",
  },
  {
    id: "lunch",
    title: "Lunch & Clean Up Spaces",
    time: "12 – 1pm",
    startMinutes: 12 * 60,
    endMinutes: 13 * 60,
    emoji: "🍎",
    accent: "#f59e0b",
    xp: 10,
    note: "Eat well, then tidy your space.",
  },
  {
    id: "fun-learning",
    title: "Fun Learning, Play & Wrap-Up",
    time: "1 – 2:30pm",
    startMinutes: 13 * 60,
    endMinutes: 14 * 60 + 30,
    emoji: "🧩",
    accent: "#06b6d4",
    xp: 15,
    note: "Games, science, or a brain-game mission.",
  },
  {
    id: "clean-up",
    title: "Clean Up Time",
    time: "2:30pm",
    startMinutes: 14 * 60 + 30,
    endMinutes: 15 * 60,
    emoji: "🧹",
    accent: "#14b8a6",
    xp: 10,
    note: "Reset the house — a chore mission counts!",
  },
  {
    id: "free-time",
    title: "Free Time",
    time: "3 – 5pm",
    startMinutes: 15 * 60,
    endMinutes: 17 * 60,
    emoji: "🎉",
    accent: "#ec4899",
    xp: 5,
    note: "You earned it. Play however you like.",
  },
];

export const SCHEDULE_TOTAL_XP = SCHEDULE.reduce((sum, b) => sum + b.xp, 0);

export const SCHEDULE_BY_ID: Record<string, ScheduleBlock> = Object.fromEntries(
  SCHEDULE.map((b) => [b.id, b]),
);

/** Quick blockId -> xp lookup for derived totals. */
export const SCHEDULE_XP: Record<string, number> = Object.fromEntries(
  SCHEDULE.map((b) => [b.id, b.xp]),
);
