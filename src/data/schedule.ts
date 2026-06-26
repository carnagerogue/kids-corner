import type { ScheduleBlock, SchedulePlan } from "../types";

// The daily rhythm from the family calendar. Times are stored as minutes from
// midnight so we can highlight whatever block is happening right now. This is
// the SEED for the editable "family" schedule plan — grown-ups can change it.
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

// --- Editable schedule plans ----------------------------------------------

/** The id of the always-present, everyone-follows-it family plan. */
export const FAMILY_PLAN_ID = "family";

/** Accent colors handed out, in order, to freshly added blocks. */
export const BLOCK_ACCENTS = [
  "#ff8a3d",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f59e0b",
  "#06b6d4",
  "#14b8a6",
  "#ec4899",
];

/** The default set of plans for a brand-new family (just the seeded family). */
export function defaultSchedules(): SchedulePlan[] {
  return [
    {
      id: FAMILY_PLAN_ID,
      name: "Everyone",
      scope: { kind: "family" },
      blocks: SCHEDULE.map((b) => ({ ...b })),
    },
  ];
}

/** "8:30am" / "12pm" / "2:30pm" for a minutes-from-midnight value. */
export function formatTime(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const mer = h24 < 12 ? "am" : "pm";
  let h = h24 % 12;
  if (h === 0) h = 12;
  return m === 0 ? `${h}${mer}` : `${h}:${String(m).padStart(2, "0")}${mer}`;
}

/** "8:30 – 9:30am" — collapses the am/pm when both ends share it. */
export function formatRange(start: number, end: number): string {
  const startMer = Math.floor(start / 60) < 12 ? "am" : "pm";
  const endMer = Math.floor(end / 60) < 12 ? "am" : "pm";
  const startStr =
    startMer === endMer ? formatTime(start).replace(/am|pm/, "") : formatTime(start);
  return `${startStr} – ${formatTime(end)}`;
}

/** Minutes-from-midnight -> "HH:MM" for an <input type="time">. */
export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "HH:MM" from an <input type="time"> -> minutes from midnight. */
export function hhmmToMinutes(value: string): number {
  const [h, m] = value.split(":").map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}
