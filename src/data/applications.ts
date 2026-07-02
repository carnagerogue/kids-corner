import type { AppLink, Assignment, Credential, KidId } from "../types";
import { RESOURCE_DOMAINS } from "./resources";

// Private logins live ONLY in `credentials.local.ts`, which is gitignored —
// never committed, never deployed. If that file is missing (a fresh clone or
// the public GitHub Pages build), no logins are shown and the cards just link
// out. See `credentials.local.example.ts` to set it up locally.
const localCredModules = import.meta.glob<{
  CREDENTIALS?: Partial<Record<KidId, Credential>>;
}>("./credentials.local.ts", { eager: true });
const LOCAL_CREDENTIALS: Partial<Record<KidId, Credential>> =
  Object.values(localCredModules)[0]?.CREDENTIALS ?? {};

/** An app a grown-up can switch on/off per kid. `primary` = a main platform. */
export type CatalogApp = AppLink & { primary?: boolean };

// Every app a grown-up can grant to a kid. Logins (if set locally) attach to
// the three main platforms; they're never committed or deployed.
export const APP_CATALOG: CatalogApp[] = [
  {
    id: "edgenuity",
    name: "Edgenuity",
    url: "https://auth.edgenuity.com/Login/Login/Student",
    emoji: "🎓",
    note: "Main school platform.",
    primary: true,
    credential: LOCAL_CREDENTIALS.claire,
  },
  {
    id: "ascend-math",
    name: "Ascend Math",
    url: "https://www.ascendmath.com/",
    emoji: "📐",
    note: "Adaptive math platform.",
    primary: true,
    credential: LOCAL_CREDENTIALS.coby,
  },
  {
    id: "coursera",
    name: "Coursera",
    url: "https://www.coursera.org/",
    emoji: "🎓",
    note: "Online courses.",
    primary: true,
    credential: LOCAL_CREDENTIALS.hailee,
  },
  { id: "scratch", name: "Scratch", url: "https://scratch.mit.edu/", emoji: "🐱", note: "Coding animations & games." },
  { id: "prodigy", name: "Prodigy", url: "https://www.prodigygame.com/", emoji: "🐉", note: "Math practice game." },
  { id: "mathigon", name: "Mathigon", url: "https://mathigon.org/", emoji: "📊", note: "Interactive math courses." },
  { id: "phet", name: "PhET Simulations", url: "https://phet.colorado.edu/", emoji: "🔬", note: "Science & math simulations." },
  { id: "icivics", name: "iCivics", url: "https://ed.icivics.org/", emoji: "🌍", note: "Civics games & lessons." },
  { id: "labxchange", name: "LabXchange", url: "https://www.labxchange.org/", emoji: "🧪", note: "Science labs & lessons." },
];

export const APP_CATALOG_BY_ID: Record<string, CatalogApp> = Object.fromEntries(
  APP_CATALOG.map((a) => [a.id, a]),
);

// --- Safe-browsing allow-list (Kids Corner Guardian extension) --------------
// The registrable domains each app needs (its own site + any auth/CDN hosts).
// List BASE domains only — the extension matches subdomains automatically. Kept
// conservative; a grown-up can add exceptions later.
export const APP_DOMAINS: Record<string, string[]> = {
  edgenuity: ["edgenuity.com"],
  "ascend-math": ["ascendmath.com"],
  coursera: ["coursera.org"],
  scratch: ["scratch.mit.edu"],
  prodigy: ["prodigygame.com"],
  mathigon: ["mathigon.org"],
  phet: ["phet.colorado.edu"],
  icivics: ["icivics.org"],
  labxchange: ["labxchange.org"],
};

// Sign-in + asset hosts many school apps need. Deliberately narrow — the SSO
// and font/asset endpoints, NOT google.com (that's search).
export const AUTH_PROVIDER_DOMAINS = [
  "accounts.google.com",
  "apis.google.com",
  "gstatic.com",
  "fonts.googleapis.com",
  "clever.com",
  "classlink.com",
];

// Kids Corner itself (the launcher) must always stay reachable.
export const KIDS_CORNER_DOMAINS = [
  "kids-corner-45fc2.firebaseapp.com",
  "kids-corner-45fc2.web.app",
];

// The curated Explore directory (resources.ts) is shown to every child, so its
// sites are always reachable — any kid can tap any card. Flattened once here so
// they're always on the allow-list, independent of per-kid app grants.
const RESOURCE_DOMAIN_LIST: string[] = Object.values(RESOURCE_DOMAINS).flat();
const RESOURCE_DOMAIN_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(RESOURCE_DOMAINS).flatMap(([id, ds]) =>
    ds.map((d) => [d, id] as const),
  ),
);

/** The base domains a child with these enabled apps may navigate to. */
export function allowedDomainsForKid(enabledAppIds: string[]): string[] {
  const set = new Set<string>([
    ...KIDS_CORNER_DOMAINS,
    ...AUTH_PROVIDER_DOMAINS,
    ...RESOURCE_DOMAIN_LIST,
  ]);
  for (const id of enabledAppIds)
    for (const d of APP_DOMAINS[id] ?? []) set.add(d);
  return [...set];
}

/** base domain -> app id, so the extension can attribute time + opens. */
export function appMapForKid(enabledAppIds: string[]): Record<string, string> {
  const map: Record<string, string> = { ...RESOURCE_DOMAIN_MAP };
  for (const id of enabledAppIds)
    for (const d of APP_DOMAINS[id] ?? []) map[d] = id;
  return map;
}

// What the seeded kids can see out of the box.
export const DEFAULT_VISIBLE_APPS: Record<string, string[]> = {
  claire: ["edgenuity", "scratch", "prodigy", "phet"],
  coby: ["ascend-math", "scratch", "mathigon", "phet", "icivics"],
  hailee: ["coursera", "scratch", "labxchange", "mathigon", "icivics"],
};

/** What a brand-new child can see until a grown-up grants more. */
export const DEFAULT_NEW_KID_APPS = ["scratch"];

export const DAY_THEMES: Record<number, { theme: string; emoji: string }> = {
  1: { theme: "Math", emoji: "🔢" },
  2: { theme: "Code", emoji: "💻" },
  3: { theme: "Science", emoji: "🔬" },
  4: { theme: "Civics / World", emoji: "🌍" },
  5: { theme: "Finish & Create", emoji: "🎨" },
};

export const WEEKDAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};

const ASSIGNMENT_XP = 30;

// Daily assignments straight from the family calendar. day: 1=Mon … 5=Fri.
export const ASSIGNMENTS: Assignment[] = [
  // MONDAY — Math
  {
    id: "mon-claire",
    day: 1,
    theme: "Math",
    kidId: "claire",
    platform: "Prodigy",
    url: "https://www.prodigygame.com/",
    task: "Complete 20 math questions.",
    emoji: "🔢",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "mon-coby",
    day: 1,
    theme: "Math",
    kidId: "coby",
    platform: "Mathigon",
    url: "https://mathigon.org/",
    task: "Complete one course activity; show the finished screen.",
    emoji: "🔢",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "mon-hailee",
    day: 1,
    theme: "Math",
    kidId: "hailee",
    platform: "LabXchange",
    url: "https://www.labxchange.org/",
    task: "Complete one science lesson or virtual lab; write 3 observations.",
    emoji: "🔬",
    xp: ASSIGNMENT_XP,
  },

  // TUESDAY — Code
  {
    id: "tue-claire",
    day: 2,
    theme: "Code",
    kidId: "claire",
    platform: "Scratch",
    url: "https://scratch.mit.edu/",
    task: "Make an animation with 3 sprites.",
    emoji: "💻",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "tue-coby",
    day: 2,
    theme: "Code",
    kidId: "coby",
    platform: "Scratch",
    url: "https://scratch.mit.edu/",
    task: "Build or improve a game with a score or timer; show it working.",
    emoji: "💻",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "tue-hailee",
    day: 2,
    theme: "Code",
    kidId: "hailee",
    platform: "Scratch",
    url: "https://scratch.mit.edu/",
    task: "Build an interactive story or game with 2 choices.",
    emoji: "💻",
    xp: ASSIGNMENT_XP,
  },

  // WEDNESDAY — Science
  {
    id: "wed-claire",
    day: 3,
    theme: "Science",
    kidId: "claire",
    platform: "PhET",
    url: "https://phet.colorado.edu/",
    task: "Try one simulation; draw or tell 3 things you noticed.",
    emoji: "🔬",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "wed-coby",
    day: 3,
    theme: "Science",
    kidId: "coby",
    platform: "PhET Circuit Lab",
    url: "https://phet.colorado.edu/en/simulations/circuit-construction-kit-dc",
    task: "Build a working circuit; explain what changed when a battery or bulb was added.",
    emoji: "🔌",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "wed-hailee",
    day: 3,
    theme: "Science",
    kidId: "hailee",
    platform: "LabXchange",
    url: "https://www.labxchange.org/",
    task: "Complete one virtual lab or biology interactive; record 3 observations.",
    emoji: "🔬",
    xp: ASSIGNMENT_XP,
  },

  // THURSDAY — Civics / World
  {
    id: "thu-claire",
    day: 4,
    theme: "Civics / World",
    kidId: "claire",
    platform: "Prodigy",
    url: "https://www.prodigygame.com/",
    task: "Complete 20 questions.",
    emoji: "🌍",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "thu-coby",
    day: 4,
    theme: "Civics / World",
    kidId: "coby",
    platform: "iCivics",
    url: "https://ed.icivics.org/",
    task: "Play the assigned game; report one decision and its result.",
    emoji: "🌍",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "thu-hailee",
    day: 4,
    theme: "Civics / World",
    kidId: "hailee",
    platform: "iCivics",
    url: "https://ed.icivics.org/",
    task: "Complete one game or lesson; write a 3-sentence reflection.",
    emoji: "🌍",
    xp: ASSIGNMENT_XP,
  },

  // FRIDAY — Finish & Create
  {
    id: "fri-claire",
    day: 5,
    theme: "Finish & Create",
    kidId: "claire",
    platform: "Scratch",
    url: "https://scratch.mit.edu/",
    task: "Finish this week's animation.",
    emoji: "🎨",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "fri-coby",
    day: 5,
    theme: "Finish & Create",
    kidId: "coby",
    platform: "Scratch",
    url: "https://scratch.mit.edu/",
    task: "Finish and demonstrate this week's game feature.",
    emoji: "🎨",
    xp: ASSIGNMENT_XP,
  },
  {
    id: "fri-hailee",
    day: 5,
    theme: "Finish & Create",
    kidId: "hailee",
    platform: "Mathigon",
    url: "https://mathigon.org/",
    task: "Complete one interactive course activity or create a visual explanation.",
    emoji: "🎨",
    xp: ASSIGNMENT_XP,
  },
];

export const ASSIGNMENT_BY_ID: Record<string, Assignment> = Object.fromEntries(
  ASSIGNMENTS.map((a) => [a.id, a]),
);

// The house rules from the calendar.
export const DAILY_RULE =
  "Follow today's day only. No switching sites until the task is done.";

export const KID_RULES: Partial<Record<KidId, string>> = {
  coby: "Stay on today's link. Work 25 minutes, take a 5-minute break, then finish and show the result.",
};

export function assignmentsForDay(day: number): Assignment[] {
  return ASSIGNMENTS.filter((a) => a.day === day);
}

export function assignmentFor(kidId: KidId, day: number): Assignment | null {
  return ASSIGNMENTS.find((a) => a.kidId === kidId && a.day === day) ?? null;
}

export function weeklyFor(kidId: KidId): Assignment[] {
  return ASSIGNMENTS.filter((a) => a.kidId === kidId).sort(
    (a, b) => a.day - b.day,
  );
}
