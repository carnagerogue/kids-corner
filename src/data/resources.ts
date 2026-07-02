// A hand-picked library of safe, free, kid-friendly websites — educational and
// just-plain-fun. Shown on the Explore tab; each opens in a new tab.

export type ResourceCategory =
  | "learn"
  | "read"
  | "science"
  | "geography"
  | "code"
  | "create"
  | "math"
  | "games";

export type Resource = {
  id: string;
  name: string;
  url: string;
  emoji: string;
  category: ResourceCategory;
  blurb: string;
};

export const RESOURCE_CATEGORIES: {
  id: ResourceCategory;
  label: string;
  emoji: string;
  color: string;
}[] = [
  { id: "learn", label: "Learn", emoji: "📚", color: "#f59e0b" },
  { id: "read", label: "Reading", emoji: "📖", color: "#3b82f6" },
  { id: "science", label: "Science", emoji: "🔬", color: "#06b6d4" },
  { id: "geography", label: "Geography", emoji: "🌍", color: "#22c55e" },
  { id: "code", label: "Coding", emoji: "💻", color: "#a855f7" },
  { id: "create", label: "Create & Music", emoji: "🎨", color: "#ef4444" },
  { id: "math", label: "Math", emoji: "🔢", color: "#ec4899" },
  { id: "games", label: "Brain & Games", emoji: "🧠", color: "#eab308" },
];

export const RESOURCE_CAT_BY_ID: Record<
  ResourceCategory,
  (typeof RESOURCE_CATEGORIES)[number]
> = Object.fromEntries(RESOURCE_CATEGORIES.map((c) => [c.id, c])) as Record<
  ResourceCategory,
  (typeof RESOURCE_CATEGORIES)[number]
>;

export const RESOURCES: Resource[] = [
  // --- Learn ---------------------------------------------------------------
  {
    id: "khan-academy",
    name: "Khan Academy",
    url: "https://www.khanacademy.org/",
    emoji: "🎓",
    category: "learn",
    blurb: "Free lessons in math, science, history, and more.",
  },
  {
    id: "pbs-kids",
    name: "PBS Kids",
    url: "https://pbskids.org/",
    emoji: "📺",
    category: "learn",
    blurb: "Games and shows with your favorite characters.",
  },
  {
    id: "natgeo-kids",
    name: "Nat Geo Kids",
    url: "https://kids.nationalgeographic.com/",
    emoji: "🐘",
    category: "learn",
    blurb: "Animals, science, and amazing facts.",
  },
  {
    id: "wonderopolis",
    name: "Wonderopolis",
    url: "https://wonderopolis.org/",
    emoji: "💡",
    category: "learn",
    blurb: "A new 'Wonder of the Day' to explore.",
  },
  {
    id: "funbrain",
    name: "Funbrain",
    url: "https://www.funbrain.com/",
    emoji: "🧩",
    category: "learn",
    blurb: "Learning games, books, and videos.",
  },

  // --- Reading -------------------------------------------------------------
  {
    id: "storyline-online",
    name: "Storyline Online",
    url: "https://storylineonline.net/",
    emoji: "📚",
    category: "read",
    blurb: "Famous actors read picture books aloud.",
  },
  {
    id: "starfall",
    name: "Starfall",
    url: "https://www.starfall.com/",
    emoji: "⭐",
    category: "read",
    blurb: "Learn to read with songs and games.",
  },
  {
    id: "icdl",
    name: "Children's Library",
    url: "https://en.childrenslibrary.org/",
    emoji: "🌍",
    category: "read",
    blurb: "Free picture books from around the world.",
  },

  // --- Science -------------------------------------------------------------
  {
    id: "climate-kids",
    name: "NASA Climate Kids",
    url: "https://climatekids.nasa.gov/",
    emoji: "🌎",
    category: "science",
    blurb: "Games and facts about our planet.",
  },
  {
    id: "nasa-kids-club",
    name: "NASA Kids' Club",
    url: "https://www.nasa.gov/kidsclub/index.html",
    emoji: "🚀",
    category: "science",
    blurb: "Space games and missions from NASA.",
  },
  {
    id: "mystery-science",
    name: "Mystery Science",
    url: "https://mysteryscience.com/",
    emoji: "🔬",
    category: "science",
    blurb: "Hands-on science lessons and videos.",
  },
  {
    id: "exploratorium",
    name: "Exploratorium",
    url: "https://www.exploratorium.edu/",
    emoji: "🧪",
    category: "science",
    blurb: "Hands-on experiments you can try.",
  },

  // --- Geography -----------------------------------------------------------
  {
    id: "google-earth",
    name: "Google Earth",
    url: "https://earth.google.com/web/",
    emoji: "🌐",
    category: "geography",
    blurb: "Fly anywhere on the planet in 3D.",
  },
  {
    id: "seterra",
    name: "Seterra Geography",
    url: "https://www.geoguessr.com/seterra",
    emoji: "🗺️",
    category: "geography",
    blurb: "Map quizzes for countries and capitals.",
  },

  // --- Coding --------------------------------------------------------------
  {
    id: "code-org",
    name: "Code.org",
    url: "https://code.org/",
    emoji: "💻",
    category: "code",
    blurb: "Learn to code with fun puzzles.",
  },
  {
    id: "blockly-games",
    name: "Blockly Games",
    url: "https://blockly.games/",
    emoji: "🧱",
    category: "code",
    blurb: "Coding games that get trickier as you go.",
  },
  {
    id: "codecombat",
    name: "CodeCombat",
    url: "https://codecombat.com/",
    emoji: "⚔️",
    category: "code",
    blurb: "Learn real code by playing a game.",
  },

  // --- Create & Music ------------------------------------------------------
  {
    id: "quick-draw",
    name: "Quick, Draw!",
    url: "https://quickdraw.withgoogle.com/",
    emoji: "✏️",
    category: "create",
    blurb: "Can a computer guess your doodles?",
  },
  {
    id: "chrome-music-lab",
    name: "Chrome Music Lab",
    url: "https://musiclab.chromeexperiments.com/",
    emoji: "🎹",
    category: "create",
    blurb: "Make music and explore sound.",
  },
  {
    id: "toy-theater",
    name: "Toy Theater",
    url: "https://toytheater.com/",
    emoji: "🎭",
    category: "create",
    blurb: "Art tools and learning games.",
  },
  {
    id: "tinkercad",
    name: "Tinkercad",
    url: "https://www.tinkercad.com/",
    emoji: "🧊",
    category: "create",
    blurb: "Design 3D models and simple circuits.",
  },

  // --- Math ----------------------------------------------------------------
  {
    id: "math-playground",
    name: "Math Playground",
    url: "https://www.mathplayground.com/",
    emoji: "🔢",
    category: "math",
    blurb: "Math games and logic puzzles.",
  },
  {
    id: "coolmath4kids",
    name: "Coolmath4Kids",
    url: "https://www.coolmath4kids.com/",
    emoji: "🧮",
    category: "math",
    blurb: "Math games, lessons, and puzzles.",
  },

  // --- Brain & Games -------------------------------------------------------
  {
    id: "typing-club",
    name: "Typing Club",
    url: "https://www.typingclub.com/",
    emoji: "⌨️",
    category: "games",
    blurb: "Learn to type with games.",
  },
  {
    id: "lichess",
    name: "Lichess",
    url: "https://lichess.org/",
    emoji: "♟️",
    category: "games",
    blurb: "Play and learn chess, free and ad-free.",
  },
];

export const RESOURCE_BY_ID: Record<string, Resource> = Object.fromEntries(
  RESOURCES.map((r) => [r.id, r]),
);

// --- Safe-browsing allow-list (Kids Corner Guardian) ------------------------
// The top-level domains each Explore resource navigates to: its landing site
// PLUS any domain it sends the top frame to (a redirect or a sign-in SSO). The
// extension only gates top-level navigation and matches subdomains
// automatically, so these are base registrable domains — EXCEPT Google Earth
// and Quick, Draw!, which use their specific subdomains so we don't open all of
// google.com / withgoogle.com. Landing hosts were verified against live
// redirects (e.g. wonderopolis.org -> familieslearning.org, NASA Climate Kids
// -> science.nasa.gov, covered by nasa.gov). Because the Explore directory is
// shown to EVERY child, these are always allowed regardless of per-kid grants.
export const RESOURCE_DOMAINS: Record<string, string[]> = {
  "khan-academy": ["khanacademy.org"],
  "pbs-kids": ["pbskids.org"],
  "natgeo-kids": ["nationalgeographic.com"],
  wonderopolis: ["wonderopolis.org", "familieslearning.org"],
  funbrain: ["funbrain.com"],
  "storyline-online": ["storylineonline.net"],
  starfall: ["starfall.com"],
  icdl: ["childrenslibrary.org"],
  "climate-kids": ["nasa.gov"],
  "nasa-kids-club": ["nasa.gov"],
  "mystery-science": ["mysteryscience.com"],
  exploratorium: ["exploratorium.edu"],
  "google-earth": ["earth.google.com"],
  seterra: ["geoguessr.com"],
  "code-org": ["code.org"],
  "blockly-games": ["blockly.games"],
  codecombat: ["codecombat.com"],
  "quick-draw": ["quickdraw.withgoogle.com"],
  "chrome-music-lab": ["chromeexperiments.com"],
  "toy-theater": ["toytheater.com"],
  tinkercad: ["tinkercad.com", "autodesk.com"],
  "math-playground": ["mathplayground.com"],
  coolmath4kids: ["coolmath4kids.com"],
  "typing-club": ["typingclub.com", "edclub.com"],
  lichess: ["lichess.org"],
};
