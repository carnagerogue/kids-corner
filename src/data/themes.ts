import type { ThemeId } from "../types";

/** A look-and-feel for the animated cursor + background. Picked per kid. */
export type Theme = {
  id: ThemeId;
  label: string;
  emoji: string; // picker icon
  /** True for dark-UI themes (drives the picker label + a dark palette). */
  dark?: boolean;
  cursor: {
    main: string; // the pointer emoji
    trail: string[]; // particles spawned while moving
    ring: string; // glow-ring border color
    glow: string; // glow-ring shadow color
  };
  background: {
    floats: string[]; // emoji that drift up the screen
    blobs: [string, string, string]; // 3 soft background blob colors
  };
};

export const THEMES: Theme[] = [
  {
    id: "sparkle",
    label: "Sparkle",
    emoji: "🌸",
    cursor: {
      main: "⭐",
      trail: ["✨", "⭐", "💫", "🌟"],
      ring: "rgba(255, 90, 140, 0.55)",
      glow: "rgba(255, 120, 170, 0.5)",
    },
    background: {
      floats: [
        "⭐", "✨", "☁️", "🎈", "🌈", "☀️",
        "🪐", "🌙", "💖", "💫", "🦋", "🌻",
      ],
      blobs: ["#ffc9e4", "#ffe3a8", "#cfc4ff"],
    },
  },
  {
    id: "adventure",
    label: "Adventure",
    emoji: "🚀",
    cursor: {
      main: "🚀",
      trail: ["🔥", "⭐", "⚡", "💥"],
      ring: "rgba(37, 99, 235, 0.6)",
      glow: "rgba(34, 197, 94, 0.5)",
    },
    background: {
      floats: [
        "🚀", "🛸", "🪐", "🌟", "⚡", "🦖",
        "👾", "🏆", "⚽", "🏎️", "🦈", "🔥",
      ],
      blobs: ["#bcd9ff", "#b9f0d6", "#c7d2fe"],
    },
  },
  {
    id: "ocean",
    label: "Ocean",
    emoji: "🌊",
    cursor: {
      main: "🐠",
      trail: ["💧", "🫧", "⭐", "✨"],
      ring: "rgba(13, 148, 136, 0.6)",
      glow: "rgba(56, 189, 248, 0.5)",
    },
    background: {
      floats: [
        "🐠", "🐟", "🐬", "🐳", "🐙", "⭐",
        "🫧", "🌊", "🐚", "🦀", "🏝️", "⛵",
      ],
      blobs: ["#bae6fd", "#a7f3d0", "#bfdbfe"],
    },
  },
  // --- Darker / sleeker looks (great for older kids & teens) ---------------
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🌙",
    dark: true,
    cursor: {
      main: "🌙",
      trail: ["✨", "⭐", "💫", "🌟"],
      ring: "rgba(167, 139, 250, 0.65)",
      glow: "rgba(99, 102, 241, 0.55)",
    },
    background: {
      floats: [
        "🌙", "⭐", "✨", "🪐", "💫", "🌌",
        "☄️", "🛰️", "🌠", "🔭", "🌃", "✦",
      ],
      blobs: [
        "rgba(99, 102, 241, 0.5)",
        "rgba(168, 85, 247, 0.42)",
        "rgba(56, 189, 248, 0.32)",
      ],
    },
  },
  {
    id: "neon",
    label: "Neon",
    emoji: "⚡",
    dark: true,
    cursor: {
      main: "⚡",
      trail: ["✦", "◆", "▲", "●"],
      ring: "rgba(244, 114, 182, 0.75)",
      glow: "rgba(34, 211, 238, 0.6)",
    },
    background: {
      // Geometric glyphs, not emoji — a sleeker, less-cutesy vibe.
      floats: [
        "◆", "✦", "▲", "●", "◇", "✧",
        "■", "▰", "⬡", "✕", "◈", "╱",
      ],
      blobs: [
        "rgba(236, 72, 153, 0.45)",
        "rgba(34, 211, 238, 0.4)",
        "rgba(168, 85, 247, 0.4)",
      ],
    },
  },
  {
    id: "mono",
    label: "Minimal",
    emoji: "◐",
    cursor: {
      main: "●",
      trail: ["•", "◦", "·", "∙"],
      ring: "rgba(100, 116, 139, 0.5)",
      glow: "rgba(148, 163, 184, 0.4)",
    },
    background: {
      floats: [
        "○", "◇", "△", "•", "◻", "◌",
        "⬡", "╱", "—", "·", "◦", "✕",
      ],
      blobs: ["#e2e8f0", "#eef2f7", "#e7e9f0"],
    },
  },
];

export const THEME_BY_ID: Record<ThemeId, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
) as Record<ThemeId, Theme>;

export const DEFAULT_THEME: ThemeId = "sparkle";

/** Tolerate unknown/missing ids by falling back to the default theme. */
export function resolveTheme(id: string | undefined | null): Theme {
  return (id && THEME_BY_ID[id as ThemeId]) || THEME_BY_ID[DEFAULT_THEME];
}
