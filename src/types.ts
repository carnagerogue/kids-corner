// ---------------------------------------------------------------------------
// Kids Corner — shared types
// ---------------------------------------------------------------------------

// Kids are now a dynamic, parent-managed roster, so a KidId is just a string id.
export type KidId = string;

/** A look-and-feel for the animated cursor + background (see data/themes.ts). */
export type ThemeId =
  | "sparkle"
  | "adventure"
  | "ocean"
  | "midnight"
  | "neon"
  | "mono";

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

// --- Avatar dress-up ------------------------------------------------------

/** The customizable layers of a kid's chibi avatar. */
export type GearSlot =
  | "bodyType"
  | "skin"
  | "hair"
  | "hairColor"
  | "eyeShape"
  | "eyeColor"
  | "face"
  | "outfit"
  | "hat"
  | "accessory"
  | "pet"
  | "scene";

/** Which gear item id is equipped in each slot (missing = the free default). */
export type AvatarConfig = Partial<Record<GearSlot, string>>;

/** Collectible tiers, cheap → showstopper. */
export type Rarity = "common" | "rare" | "epic" | "legendary";

/** A buyable/equippable avatar piece (see data/avatar.tsx). */
export type GearItem = {
  id: string;
  slot: GearSlot;
  name: string;
  /** Coins to unlock. 0 = free default (always owned). */
  price: number;
  /** Hidden in the shop until the kid reaches this level. */
  levelReq?: number;
  /** Collectible tier (drives the card's frame + label). */
  rarity?: Rarity;
  /**
   * Slot-specific value used by the renderer: a CSS color for skin/hairColor,
   * or a style/key string the layer renderers switch on. Empty = nothing.
   */
  value: string;
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

/** Who an activity suits — lets grown-ups give teens grown-up-level tasks. */
export type Audience = "all" | "kids" | "teens";

export type ActivityIdea = {
  id: string;
  title: string;
  category: ActivityCategory;
  estimatedMinutes: number;
  supplies: string[];
  difficulty: "easy" | "medium" | "challenge";
  bestFor: Array<KidId | "everyone">;
  indoorOutdoor: "indoor" | "outdoor" | "either";
  parentHelp: boolean;
  steps: string[];
  xp: number;
  /** Age fit. Defaults to "all" when omitted. */
  audience?: Audience;
  /** True for grown-up-created activities (stored in state, not the catalog). */
  custom?: boolean;
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

/** Who a schedule applies to: everyone, or a specific set of kids. */
export type ScheduleScope =
  | { kind: "family" }
  | { kind: "kids"; kidIds: KidId[] };

/**
 * A named daily schedule a grown-up can edit. The "family" plan is the default
 * everyone follows; a kids-scoped plan overrides it for one child (unique) or
 * several (a group).
 */
export type SchedulePlan = {
  id: string;
  name: string;
  scope: ScheduleScope;
  blocks: ScheduleBlock[];
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
  /** The other kid this mission was done together with, if any. */
  partnerId?: KidId;
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

/** A conversation participant: a kid's id, or the grown-ups. */
export type ParticipantId = KidId | "parent";

/** A direct message between two participants (kid↔kid or kid↔parent). */
export type Message = {
  id: string;
  from: ParticipantId;
  to: ParticipantId;
  text: string;
  /** Optional downscaled image attachment (data URL). */
  photo?: string;
  at: number; // epoch ms
  /** Read by the recipient (`to`). */
  read: boolean;
  /** Soft-deleted by the sender (kept as a tombstone so removal syncs). */
  deleted?: boolean;
};

/** A grown-up broadcast shown to every kid. */
export type Announcement = {
  id: string;
  text: string;
  at: number; // epoch ms
  deleted?: boolean;
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
  /** The parent-managed roster of kids (order = display order). */
  kidProfiles: Kid[];
  /** Ids of kids removed by a grown-up — tombstones so removals sync. */
  removedKids: KidId[];
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
  /**
   * Grown-up-editable daily schedules. Always contains a "family" plan
   * (everyone's default); extra plans override it per-kid or per-group.
   */
  schedules: SchedulePlan[];
  /** Grown-up-created chores/activities (merged with the built-in catalog). */
  customActivities: ActivityIdea[];
  /** Example photos a grown-up attached, keyed by activity id (data URLs). */
  activityImages: Record<string, string>;
  /** Coins each kid has spent in the avatar shop (earned coins track XP). */
  coinsSpent: Record<KidId, number>;
  /** Bonus coins won from mystery-box spins (added to earned). */
  coinsBonus: Record<KidId, number>;
  /** Date (YYYY-MM-DD) of each kid's last free daily spin. */
  lastSpin: Record<KidId, string>;
  /** Gear item ids each kid has unlocked (free defaults are always owned). */
  ownedGear: Record<KidId, string[]>;
  /** Each kid's currently equipped avatar gear, per slot. */
  avatar: Record<KidId, AvatarConfig>;
  /** Each kid's chosen look for the cursor + background. */
  themes: Record<KidId, ThemeId>;
  /** Messages between each kid and the grown-ups. */
  messages: Message[];
  /** Grown-up broadcasts shown to all kids. */
  announcements: Announcement[];
  /** App-catalog ids each kid is allowed to see (parent-controlled). */
  appVisibility: Record<KidId, string[]>;
  /** Explore resource ids each kid CANNOT see (default: none hidden). */
  exploreHidden: Record<KidId, string[]>;
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
