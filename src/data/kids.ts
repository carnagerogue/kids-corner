import type { Kid, ThemeId } from "../types";

// The kids that ship by default. The roster is editable in the Grown-Ups area,
// so this is only the starting point (stored in app state thereafter).
export const DEFAULT_KIDS: Kid[] = [
  {
    id: "claire",
    name: "Claire Moon",
    firstName: "Claire",
    emoji: "🌙",
    color: "#e21b3c",
    colorDark: "#a3122a",
    colorSoft: "#fde7ea",
    motto: "Dream big, shine bright.",
  },
  {
    id: "coby",
    name: "Coby Lee",
    firstName: "Coby",
    emoji: "🚀",
    color: "#a8174f",
    colorDark: "#7a1039",
    colorSoft: "#fbe4ee",
    motto: "Build it, blast off!",
  },
  {
    id: "hailee",
    name: "Hailee Lee",
    firstName: "Hailee",
    emoji: "☀️",
    color: "#ff5a1f",
    colorDark: "#c63d0d",
    colorSoft: "#ffe9df",
    motto: "Make today sunny.",
  },
];

/**
 * Starting PIN / theme for the seeded kids. Stored as SHA-256 hashes (see
 * src/lib/hash.ts) of "1111" / "2222" / "3333" — never the raw PIN, even as
 * a default. A grown-up should still change these in the Grown-Ups area.
 */
export const DEFAULT_KID_PINS: Record<string, string> = {
  claire: "c0e5f6d827607a1eca8db009f69f86889e5215386f6db04b6ed81fad566853d9",
  coby: "40991afe001d79c281b69611c83f4c1ef7e36906b4bcbdadd6655e9842904c11",
  hailee: "526d152c1cc331fa634642106181ebfcc5f0d86b209de96902316206c4dda2d3",
};
export const DEFAULT_KID_THEMES: Record<string, ThemeId> = {
  claire: "sparkle",
  coby: "adventure",
  hailee: "sparkle",
};

/** Color choices offered when a grown-up adds a new child. */
export const KID_PALETTE: Pick<Kid, "color" | "colorDark" | "colorSoft">[] = [
  { color: "#e21b3c", colorDark: "#a3122a", colorSoft: "#fde7ea" }, // crimson
  { color: "#a8174f", colorDark: "#7a1039", colorSoft: "#fbe4ee" }, // berry
  { color: "#ff5a1f", colorDark: "#c63d0d", colorSoft: "#ffe9df" }, // orange
  { color: "#2563eb", colorDark: "#1e40af", colorSoft: "#e0ecff" }, // blue
  { color: "#16a34a", colorDark: "#136f37", colorSoft: "#dcfce7" }, // green
  { color: "#9333ea", colorDark: "#6b21a8", colorSoft: "#f3e8ff" }, // purple
  { color: "#0891b2", colorDark: "#0e7490", colorSoft: "#cffafe" }, // teal
  { color: "#db2777", colorDark: "#9d174d", colorSoft: "#fce7f3" }, // pink
];

/** Avatar choices offered when adding a child. */
export const KID_EMOJIS = [
  "🌙", "🚀", "☀️", "⭐", "🦄", "🐯", "🐲", "🦊",
  "🐰", "🎮", "⚽", "🦖", "🌈", "🐬", "🦋", "🐼",
];

/** Build a Kid from a name + chosen emoji/color. */
export function makeKid(opts: {
  id: string;
  firstName: string;
  emoji: string;
  paletteIndex: number;
  motto?: string;
}): Kid {
  const pal = KID_PALETTE[opts.paletteIndex % KID_PALETTE.length];
  return {
    id: opts.id,
    name: opts.firstName,
    firstName: opts.firstName,
    emoji: opts.emoji,
    color: pal.color,
    colorDark: pal.colorDark,
    colorSoft: pal.colorSoft,
    motto: opts.motto ?? "Let's have a great day!",
  };
}
