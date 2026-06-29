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

// --- Avatar -----------------------------------------------------------------

/** Collectible tiers, cheap → showstopper (shared by the 3D avatar catalog). */
export type Rarity = "common" | "rare" | "epic" | "legendary";

// --- 3D avatar (VRoid/VRM-compatible game layer) --------------------------
// A manifest-driven cosmetic system that renders in Three.js. Coins are unified
// (ownedGear + coinsSpent). See src/features/avatar/ and public/assets/avatar/.

/** Cosmetic slots of the 3D avatar. */
export type Avatar3DSlot =
  | "base"
  | "skinTone"
  | "eyeColor"
  | "hairStyle"
  | "hairColor"
  | "outfit"
  | "shoes"
  | "hat"
  | "glasses"
  | "backpack"
  | "handheld"
  | "pet"
  | "aura"
  | "room"
  | "animation";

/** Which manifest item id is equipped in each 3D slot (missing = default). */
export type Loadout3D = Partial<Record<Avatar3DSlot, string>>;

/** A saved outfit preset a learner can re-apply (School Mode, Space Mode, …). */
export type SavedLoadout3D = {
  id: string;
  name: string;
  emoji?: string;
  loadout: Loadout3D;
};

/**
 * The minimal item facts the UI hands to BUY_AVATAR_ITEM so the pure reducer can
 * validate a purchase without ever reading the (async-loaded) manifest.
 */
export type Avatar3DBuyInfo = {
  id: string;
  slot: Avatar3DSlot;
  price: number;
  levelReq?: number;
};

/** Rarity tiers used by the 3D manifest (extends the 2D Rarity set). */
export type Rarity3D = Rarity | "uncommon" | "seasonal";

/**
 * Grown-up-editable reward amounts: bonus coins granted (once) when a task is
 * approved. These are ON TOP of the coins a learner already earns from XP, so a
 * grown-up can dial how rewarding each finished task feels. 0 disables a bonus.
 */
export type RewardRates = {
  /** Bonus coins for an approved mission. */
  mission: number;
  /** Bonus coins for an approved learning/assignment task. */
  assignment: number;
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

/** A kid's sticker reaction to someone's finished-task photo. */
export type Reaction = {
  id: string;
  /** The submission (photo) being reacted to. */
  submissionId: string;
  by: KidId;
  emoji: string;
  at: number;
  deleted?: boolean;
};

// --- Kid friendships / social permissions ---------------------------------

export type FriendshipStatus =
  | "pending"
  | "friends"
  | "declined"
  | "blocked"
  | "removed";

/** Relationship between two kids. Parents can still review/moderate all data. */
export type Friendship = {
  id: string;
  kidA: KidId;
  kidB: KidId;
  status: FriendshipStatus;
  /** Who sent the latest request. Omitted for removed/blocked relationships. */
  requestedBy?: KidId;
  updatedAt: number;
};

/** A collective goal the whole family works toward. */
export type FamilyGoal = {
  /** Approved tasks (across all kids) needed to win. */
  target: number;
  /** What the family earns, e.g. "movie night". */
  reward: string;
  /** Tasks approved on/after this date (YYYY-MM-DD) count. */
  since: string;
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
  /** Each kid's equipped 3D/VRM avatar loadout (manifest item ids per slot). */
  avatar3d: Record<KidId, Loadout3D>;
  /** Each kid's saved 3D outfit presets (School Mode, Space Mode, …). */
  loadouts3d: Record<KidId, SavedLoadout3D[]>;
  /** Per-kid grown-up lock that disables shop purchases when true. */
  purchasesLocked: Record<KidId, boolean>;
  /** Each kid's chosen look for the cursor + background. */
  themes: Record<KidId, ThemeId>;
  /** Messages between each kid and the grown-ups. */
  messages: Message[];
  /** Grown-up broadcasts shown to all kids. */
  announcements: Announcement[];
  /** Sticker reactions to finished-task photos (the family wall). */
  reactions: Reaction[];
  /**
   * Kid-to-kid social graph. Static/local builds can only enforce this in the
   * client; a production backend must repeat these permission checks server-side.
   */
  friendships: Friendship[];
  /** The current shared family goal, if a grown-up set one. */
  familyGoal: FamilyGoal | null;
  /** Grown-up-editable bonus coins per approved task (mission / assignment). */
  rewardRates: RewardRates;
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
