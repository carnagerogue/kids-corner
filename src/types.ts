// ---------------------------------------------------------------------------
// Kids Corner — shared types
// ---------------------------------------------------------------------------

export type KidId = "claire" | "coby" | "hailee";

/** A look-and-feel for the animated cursor + background (see data/themes.ts). */
export type ThemeId = "sparkle" | "adventure" | "ocean";

export type Kid = {
  id: KidId;
  name: string; // full name, e.g. "Claire Moon"
  firstName: string; // "Claire"
  emoji: string;
  /** Primary theme color (matches the family calendar) */
  color: string;
  /** Darker shade for gradients / text on light */
  colorDark: string;
  /** Soft tint used for card backgrounds */
  colorSoft: string;
  motto: string;
};

// --- Activities (the summer mission library) ------------------------------

export type ActivityCategory =
  | "arts-crafts"
  | "drawing"
  | "building"
  | "outdoor"
  | "science"
  | "writing"
  | "music"
  | "brain-games"
  | "family"
  | "kindness"
  | "chores"
  | "quiet";

export type ActivityIdea = {
  id: string;
  title: string;
  category: ActivityCategory;
  estimatedMinutes: number;
  supplies: string[];
  difficulty: "easy" | "medium" | "challenge";
  bestFor: Array<"claire" | "coby" | "hailee" | "everyone">;
  indoorOutdoor: "indoor" | "outdoor" | "either";
  parentHelp: boolean;
  steps: string[];
  xp: number;
};

// --- Daily schedule -------------------------------------------------------

export type ScheduleBlock = {
  id: string;
  title: string;
  /** Human label, e.g. "8:30 – 9:30am" */
  time: string;
  /** Minutes from midnight, used to highlight the current block */
  startMinutes: number;
  endMinutes: number;
  emoji: string;
  accent: string;
  xp: number;
  note?: string;
  /** When true, this block links to the Applications page. */
  opensApplications?: boolean;
};

// --- Applications & curriculum -------------------------------------------

export type Credential = { username: string; password: string };

export type AppLink = {
  id: string;
  name: string;
  url: string;
  emoji: string;
  note?: string;
  credential?: Credential;
};

/** A specific assignment for one kid on one weekday. */
export type Assignment = {
  id: string; // e.g. "wed-coby"
  day: number; // 1 = Mon ... 5 = Fri
  theme: string; // "Science"
  kidId: KidId;
  platform: string; // "PhET Circuit Lab"
  url: string;
  task: string;
  emoji: string;
  xp: number;
};

// --- Rewards --------------------------------------------------------------

export type Rank = {
  level: number;
  title: string;
  emoji: string;
  /** Total XP required to reach this level */
  minXp: number;
};

export type Badge = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  /** Returns true when the kid has earned this badge */
  earned: (stats: KidStats) => boolean;
};

// --- Proof submissions (photo + parent approval) --------------------------

export type SubmissionKind = "mission" | "assignment";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Submission = {
  id: string;
  kind: SubmissionKind;
  /** ActivityIdea id or Assignment id */
  refId: string;
  /** Denormalized for the parent review queue */
  title: string;
  emoji: string;
  kidId: KidId;
  /** Downscaled JPEG data URL. Cleared for old reviewed items to save space. */
  photo: string;
  status: SubmissionStatus;
  xp: number;
  date: string; // YYYY-MM-DD (local)
  submittedAt: number; // epoch ms
  reviewedAt?: number;
  /** Optional grown-up note, e.g. why it was sent back. */
  note?: string;
};

// --- Chore assignments (parent-decided) -----------------------------------

/** A chore a grown-up has assigned to one kid for a given day. */
export type ChoreAssignment = {
  id: string;
  kidId: KidId;
  /** ActivityIdea id of a "chores" activity */
  refId: string;
  date: string; // YYYY-MM-DD the chore is assigned for
  assignedAt: number; // epoch ms
};

// --- Messages (kid <-> parent) --------------------------------------------

export type MessageFrom = "kid" | "parent";

/** A single message in a kid's thread with the grown-ups. */
export type Message = {
  id: string;
  kidId: KidId; // whose thread this belongs to
  from: MessageFrom;
  text: string;
  at: number; // epoch ms
  readByKid: boolean;
  readByParent: boolean;
};

// --- Persisted state ------------------------------------------------------

export type DayProgress = {
  date: string; // YYYY-MM-DD (local)
  scheduleDone: string[]; // ScheduleBlock ids completed
};

export type KidState = {
  /** Earned badge ids (sticky — never removed once earned) */
  badges: string[];
  /** date string -> progress for that day */
  history: Record<string, DayProgress>;
};

export type AppState = {
  version: number;
  activeKid: KidId;
  /** Light gate so kids can't approve their own work. Not real security. */
  parentPin: string;
  /** Each kid's login PIN. Parents manage these in the Grown-Ups area. */
  kidPins: Record<KidId, string>;
  kids: Record<KidId, KidState>;
  /** All photo-proof submissions across every kid. */
  submissions: Submission[];
  /** Chores a grown-up has assigned. Kids can't pick chores themselves. */
  choreAssignments: ChoreAssignment[];
  /** Each kid's chosen look for the cursor + background. */
  themes: Record<KidId, ThemeId>;
  /** Messages between each kid and the grown-ups. */
  messages: Message[];
};

// Derived, read-only stats used by selectors / badges.
export type KidStats = {
  totalXp: number;
  totalMissions: number; // approved mission submissions
  totalAssignments: number; // approved assignment submissions
  totalScheduleBlocks: number;
  /** Missions completed per category, across all days */
  categoryCounts: Record<ActivityCategory, number>;
  streak: number;
  /** Did the kid complete every schedule block on any single day? */
  hadFullScheduleDay: boolean;
  /** Most things (approved work + blocks) finished in a single day */
  bestDayCount: number;
};
