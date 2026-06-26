import { useId, type ReactNode } from "react";
import type { AvatarConfig, GearItem, GearSlot, Rarity } from "../types";

/**
 * Kids Corner avatar — a layered, cel-shaded chibi "summer quest hero".
 * Everything is hand-built SVG so cosmetics swap with zero image assets.
 * Layer order (back → front): scene · pet · back-hair · body · head · face ·
 * front-hair · hat · accessory.
 */

export const STARTER_COINS = 60;

/** Coin cost of an extra mystery-box spin (the first each day is free). */
export const SPIN_COST = 40;

export const SLOT_META: { slot: GearSlot; label: string; emoji: string }[] = [
  { slot: "skin", label: "Skin", emoji: "✋" },
  { slot: "hair", label: "Hair", emoji: "💇" },
  { slot: "face", label: "Face", emoji: "😄" },
  { slot: "outfit", label: "Outfit", emoji: "👕" },
  { slot: "hat", label: "Hat", emoji: "🧢" },
  { slot: "accessory", label: "Gear", emoji: "🎒" },
  { slot: "pet", label: "Pet", emoji: "🐾" },
  { slot: "scene", label: "Scene", emoji: "🌌" },
];

// --- Color palettes -------------------------------------------------------

type Tone = { base: string; shade: string };
export const SKIN_TONES: Record<string, Tone> = {
  porcelain: { base: "#ffe2cf", shade: "#f0bd9d" },
  light: { base: "#f7c9a0", shade: "#e2a173" },
  warm: { base: "#e8ad7c", shade: "#cd8c5b" },
  tan: { base: "#c98a5b", shade: "#a86c43" },
  brown: { base: "#9c6440", shade: "#7a4c2e" },
  deep: { base: "#6f4427", shade: "#54311b" },
};

type Hair = { base: string; light: string; dark: string };
export const HAIR_COLORS: Record<string, Hair> = {
  brown: { base: "#754c2b", light: "#9a6a3e", dark: "#523318" },
  black: { base: "#2c2738", light: "#4a4258", dark: "#1a1622" },
  blonde: { base: "#f2cf73", light: "#ffe6a3", dark: "#cba646" },
  auburn: { base: "#a8472a", light: "#cf6a44", dark: "#7e3119" },
  pink: { base: "#ff79b4", light: "#ffaad2", dark: "#e1538f" },
  blue: { base: "#54a7ff", light: "#8ac6ff", dark: "#2f7fd6" },
  mint: { base: "#54d6ad", light: "#8defc9", dark: "#2fae89" },
  lavender: { base: "#b794f0", light: "#d4bcfa", dark: "#9163d6" },
  red: { base: "#e34a3a", light: "#ff7563", dark: "#b73323" },
  silver: { base: "#cfd6e6", light: "#eef2fa", dark: "#a7b0c6" },
};

const skinOf = (id: string): Tone => SKIN_TONES[id] ?? SKIN_TONES.light;
const hairOf = (id: string): Hair => HAIR_COLORS[id] ?? HAIR_COLORS.brown;

// --- Scenes ---------------------------------------------------------------

const SCENES: Record<string, { stops: string[]; particles: string }> = {
  command: { stops: ["#3a2a6d", "#1a1340"], particles: "star" },
  sky: { stops: ["#7ec6ff", "#c9ebff"], particles: "cloud" },
  space: { stops: ["#241a52", "#0b0820"], particles: "star" },
  beach: { stops: ["#ffd9a0", "#9fe6ff"], particles: "sun" },
  forest: { stops: ["#9fe0a6", "#3f9d6b"], particles: "leaf" },
  neon: { stops: ["#3a0f5e", "#0a1340"], particles: "spark" },
  candy: { stops: ["#ffd0ec", "#c9b6ff"], particles: "spark" },
  aurora: { stops: ["#103a52", "#1b1048"], particles: "star" },
};

// =========================================================================
// Layer renderers
// =========================================================================

const t = (e: string, x: number, y: number, s: number) => (
  <text x={x} y={y} fontSize={s} textAnchor="middle" dominantBaseline="central">
    {e}
  </text>
);

// Manga line-art: a dark plum-brown outline used across the silhouette.
const LINE = "#43283c";
const LW = 3.4;

/** Big glossy "moe" eyes + tiny nose/mouth for an expression. */
function renderFace(face: string, eyeId: string) {
  // One large, dark, glossy eye centered at cx.
  const eye = (cx: number, variant: string) => {
    if (variant === "wink" && cx > 150) {
      return (
        <path
          key={cx}
          d={`M${cx - 17} 142 q17 -18 34 0`}
          fill="none"
          stroke={LINE}
          strokeWidth="6"
          strokeLinecap="round"
        />
      );
    }
    const shape = `M${cx - 17} 138 C ${cx - 17} 121 ${cx - 9} 116 ${cx} 116 C ${cx + 9} 116 ${cx + 17} 121 ${cx + 17} 138 C ${cx + 17} 158 ${cx + 9} 168 ${cx} 168 C ${cx - 9} 168 ${cx - 17} 158 ${cx - 17} 138 Z`;
    return (
      <g key={cx}>
        <path d={shape} fill={`url(#${eyeId})`} stroke={LINE} strokeWidth="2.6" strokeLinejoin="round" />
        {/* warm iris catch-glow, low */}
        <ellipse cx={cx} cy={152} rx={11} ry={11} fill="#b66a72" opacity="0.5" />
        {variant === "starry" ? (
          t("⭐", cx, 142, 18)
        ) : (
          <>
            {/* big shine + small sparkle */}
            <ellipse cx={cx - 4} cy={130} rx={7} ry={9} fill="#fff" opacity="0.92" />
            <circle cx={cx + 6} cy={154} r={3.4} fill="#fff" opacity="0.85" />
          </>
        )}
        {/* upper lid shadow */}
        <path d={`M${cx - 16} 124 q16 -10 32 0 q-6 7 -16 6 q-10 1 -16 -6 z`} fill={LINE} opacity="0.9" />
      </g>
    );
  };

  const brows =
    face === "determined" ? (
      <>
        <path d="M108 110 l24 5" stroke={LINE} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M192 110 l-24 5" stroke={LINE} strokeWidth="4.5" strokeLinecap="round" />
      </>
    ) : null;

  const mouth =
    face === "surprised" ? (
      <ellipse cx={150} cy={170} rx={7} ry={9} fill="#8a3f47" />
    ) : face === "determined" ? (
      <path d="M140 168 q10 6 20 0" fill="none" stroke="#8a3f47" strokeWidth="4" strokeLinecap="round" />
    ) : (
      <path d="M142 166 q8 9 16 0 q-8 4 -16 0 z" fill="#a8505a" />
    );

  return (
    <g>
      {brows}
      {eye(118, face)}
      {eye(182, face)}
      {/* tiny nose */}
      <ellipse cx={150} cy={154} rx={2.4} ry={1.6} fill="rgba(120,70,60,0.45)" />
      {mouth}
      {/* blush */}
      <ellipse cx={100} cy={156} rx={13} ry={7.5} fill="rgba(255,120,150,0.4)" />
      <ellipse cx={200} cy={156} rx={13} ry={7.5} fill="rgba(255,120,150,0.4)" />
    </g>
  );
}

/** Back hair (behind head/body), per style. */
function renderHairBack(style: string, c: Hair) {
  switch (style) {
    case "ponytail":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M206 98 q60 16 44 90 q-8 36 -34 48 q12 -10 12 -30 q14 -42 0 -74 q-8 -24 -34 -34 z" fill={c.base} />
          <path d="M214 116 q30 20 22 62" fill="none" stroke={c.light} strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        </g>
      );
    case "twintails":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M72 104 q-48 10 -42 76 q4 32 26 44 q-10 -10 -8 -28 q-12 -38 2 -64 q8 -22 30 -28 z" fill={c.base} />
          <path d="M228 104 q48 10 42 76 q-4 32 -26 44 q10 -10 8 -28 q12 -38 -2 -64 q-8 -22 -30 -28 z" fill={c.base} />
        </g>
      );
    case "bob":
      return (
        <path d="M68 112 q-6 74 20 100 l124 0 q26 -28 20 -100 z" fill={c.dark} stroke={LINE} strokeWidth={LW} strokeLinejoin="round" />
      );
    case "puff":
      return (
        <g fill={c.base} stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <circle cx={150} cy={68} r={66} />
          <circle cx={88} cy={108} r={36} />
          <circle cx={212} cy={108} r={36} />
        </g>
      );
    case "long":
      return (
        <path d="M64 108 q-14 100 18 134 l136 0 q30 -36 18 -134 z" fill={c.base} stroke={LINE} strokeWidth={LW} strokeLinejoin="round" />
      );
    default: // short
      return (
        <path d="M82 76 q68 -38 136 0 q12 42 -2 64 l-132 0 q-14 -22 -2 -64 z" fill={c.dark} stroke={LINE} strokeWidth={LW} strokeLinejoin="round" />
      );
  }
}

/** Front hair / bangs (pointed clumps + a glossy shine band), per style. */
function renderHairFront(style: string, c: Hair) {
  const shine = (
    <path
      d="M94 72 Q150 46 206 72 L201 86 Q150 60 99 86 Z"
      fill={c.light}
      opacity="0.7"
      stroke="none"
    />
  );
  const wrap = (kids: ReactNode) => (
    <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
      {kids}
    </g>
  );
  switch (style) {
    case "puff":
      return wrap(
        <>
          <path d="M84 96 q66 -58 132 0 q-10 18 -24 16 q-42 -32 -84 0 q-14 2 -24 -16 z" fill={c.base} />
          {shine}
        </>,
      );
    case "bob":
      return wrap(
        <>
          <path d="M70 116 q2 -82 80 -82 q78 0 80 82 l-18 -8 l-12 22 l-16 -20 l-16 24 l-12 -24 l-14 24 l-16 -22 l-12 20 z" fill={c.base} />
          {shine}
        </>,
      );
    default:
      // pointed swept fringe shared by ponytail / short / twintails / long
      return wrap(
        <>
          <path
            d="M70 120 C70 56 112 30 150 30 C188 30 230 56 230 120 L214 112 L206 126 L190 108 L174 124 L160 106 L150 120 L140 106 L126 124 L110 108 L94 126 L86 112 Z"
            fill={c.base}
          />
          {shine}
        </>,
      );
  }
}

/** Outfit: torso, sleeves, legs, shoes. */
function renderOutfit(key: string, skin: Tone) {
  const palettes: Record<string, { main: string; trim: string; pants: string; shoe: string; emblem?: string }> = {
    explorer: { main: "#2bb3a3", trim: "#f4a93c", pants: "#3a5a8c", shoe: "#f4f1ea", emblem: "#ffd23f" },
    hoodie: { main: "#7c5cff", trim: "#b9a6ff", pants: "#3a3550", shoe: "#22d3ee" },
    vest: { main: "#e2b04a", trim: "#7a4a22", pants: "#5a7d3a", shoe: "#6b4a2e" },
    hero: { main: "#ff4d6d", trim: "#ffd23f", pants: "#2a2350", shoe: "#ffd23f", emblem: "#fff" },
    space: { main: "#cfd6e6", trim: "#54a7ff", pants: "#aab4cc", shoe: "#3a4768", emblem: "#22d3ee" },
    sporty: { main: "#ef4444", trim: "#fff", pants: "#1f2733", shoe: "#fff", emblem: "#fff" },
    ninja: { main: "#2a2738", trim: "#54a7ff", pants: "#1a1622", shoe: "#2a2738", emblem: "#54a7ff" },
    princess: { main: "#ff8fc6", trim: "#ffe08a", pants: "#ffc2e0", shoe: "#fff", emblem: "#ffe08a" },
  };
  const p = palettes[key] ?? palettes.explorer;
  const sock = "#fbf7ff";
  return (
    <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round" strokeLinecap="round">
      {/* arms (behind torso) */}
      <path d="M108 230 q-26 10 -24 40 q1 16 16 20 q12 -3 12 -16 q-2 -28 -4 -44 z" fill={p.main} />
      <path d="M192 230 q26 10 24 40 q-1 16 -16 20 q-12 -3 -12 -16 q2 -28 4 -44 z" fill={p.main} />
      {/* hands */}
      <circle cx={90} cy={288} r={12} fill={skin.base} />
      <circle cx={210} cy={288} r={12} fill={skin.base} />
      {/* socks + legs */}
      <path d="M132 298 l-3 26 q9 5 17 0 l-1 -26 z" fill={sock} />
      <path d="M155 298 l3 26 q-9 5 -17 0 l-1 -26 z" fill={sock} />
      {/* shoes */}
      <path d="M124 320 q-6 15 14 15 l16 0 0 -16 q-17 -2 -30 1 z" fill={p.shoe} />
      <path d="M176 320 q6 15 -14 15 l-16 0 0 -16 q17 -2 30 1 z" fill={p.shoe} />
      {/* pleated skirt */}
      <path d="M108 280 q42 17 84 0 l17 38 q-58 18 -118 0 z" fill={p.pants} />
      <path d="M134 288 l-7 30 M150 291 v30 M166 288 l7 30" stroke={LINE} strokeWidth="2" fill="none" opacity="0.45" />
      {/* torso */}
      <path d="M104 252 q1 -38 46 -38 q45 0 46 38 l3 30 q-49 18 -98 0 z" fill={p.main} />
      {/* torso shade */}
      <path d="M152 220 q38 6 42 58 q-20 10 -42 10 z" fill="rgba(0,0,0,0.1)" stroke="none" />
      {/* sailor collar */}
      <path d="M118 216 q32 -9 64 0 l-10 22 q-22 -7 -44 0 z" fill={p.trim} />
      {/* neck tie / emblem */}
      <path d="M150 238 l-7 7 7 20 7 -20 z" fill={p.emblem ?? "#ff5a6e"} stroke="none" />
    </g>
  );
}

function renderHat(key: string) {
  switch (key) {
    case "cap":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M90 80 q60 -46 120 0 q4 -46 -60 -46 q-64 0 -60 46 z" fill="#ff5a8a" />
          <path d="M88 80 q-24 4 -32 18 q28 6 48 -6 z" fill="#e23e72" />
          <circle cx={150} cy={38} r={7} fill="#ffd23f" />
        </g>
      );
    case "beanie":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M82 88 q4 -58 68 -58 q64 0 68 58 q-68 18 -136 0 z" fill="#54a7ff" />
          <path d="M82 82 h136 v14 q-68 12 -136 0 z" fill="#2f7fd6" />
          <circle cx={150} cy={24} r={9} fill="#cfe6ff" />
        </g>
      );
    case "flower":
      return (
        <g>
          {[110, 138, 166, 194].map((x, i) => (
            <g key={x} transform={`translate(${x} ${44 + (i % 2) * 6})`}>
              <circle r={9} fill={["#ff79b4", "#ffd23f", "#a78bfa", "#5fd6a8"][i]} />
              <circle r={3.5} fill="#fff" />
            </g>
          ))}
        </g>
      );
    case "party":
      return (
        <g>
          <path d="M150 14 l26 60 q-26 12 -52 0 z" fill="#22d3ee" />
          <path d="M150 14 l-10 24 18 8 z" fill="#ff79b4" />
          <circle cx={150} cy={12} r={6} fill="#ffd23f" />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M96 70 l6 -42 26 24 22 -34 22 34 26 -24 6 42 z" fill="#ffd23f" stroke="#e0a800" strokeWidth="2" />
          <circle cx={128} cy={50} r={4} fill="#ff5a8a" />
          <circle cx={150} cy={44} r={4} fill="#54a7ff" />
          <circle cx={172} cy={50} r={4} fill="#22d3ee" />
        </g>
      );
    default:
      return null;
  }
}

function renderAccessory(key: string, where: "back" | "front") {
  if (where === "back") {
    switch (key) {
      case "backpack":
        return <rect x={108} y={236} width={84} height={64} rx={18} fill="#f4a93c" />;
      case "cape":
        return <path d="M104 228 q46 28 92 0 l18 96 q-64 26 -128 0 z" fill="#ff4d6d" />;
      case "wings":
        return (
          <g fill="rgba(160,200,255,0.85)">
            <path d="M104 230 q-60 -8 -76 44 q40 6 76 -12 z" />
            <path d="M196 230 q60 -8 76 44 q-40 6 -76 -12 z" />
          </g>
        );
      default:
        return null;
    }
  }
  switch (key) {
    case "glasses":
      return (
        <g fill="none" stroke="#2a2233" strokeWidth="4">
          <circle cx={122} cy={136} r={20} />
          <circle cx={178} cy={136} r={20} />
          <path d="M142 134 h16" strokeLinecap="round" />
        </g>
      );
    case "badge":
      return <g transform="translate(108 270)">{t("⭐", 0, 0, 26)}</g>;
    case "backpack":
      return (
        <>
          <path d="M118 224 l-10 70" stroke="#caa05a" strokeWidth="7" strokeLinecap="round" />
          <path d="M182 224 l10 70" stroke="#caa05a" strokeWidth="7" strokeLinecap="round" />
        </>
      );
    default:
      return null;
  }
}

function renderPet(key: string) {
  switch (key) {
    case "slime":
      return (
        <g className="av-pet">
          <path d="M232 300 q-26 -34 0 -56 q26 -22 52 0 q26 22 0 56 z" fill="#5fd6a8" />
          <ellipse cx={258} cy={300} rx={28} ry={6} fill="rgba(0,0,0,0.12)" />
          <circle cx={250} cy={278} r={4} fill="#1a3a2a" />
          <circle cx={268} cy={278} r={4} fill="#1a3a2a" />
          <path d="M250 290 q8 6 16 0" fill="none" stroke="#1a3a2a" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "cat":
      return <g className="av-pet">{t("🐱", 256, 296, 46)}</g>;
    case "pup":
      return <g className="av-pet">{t("🐶", 256, 296, 46)}</g>;
    case "fox":
      return <g className="av-pet">{t("🦊", 256, 296, 46)}</g>;
    case "owl":
      return <g className="av-pet">{t("🦉", 256, 296, 46)}</g>;
    case "bunny":
      return <g className="av-pet">{t("🐰", 256, 296, 46)}</g>;
    case "dragon":
      return <g className="av-pet">{t("🐉", 254, 294, 50)}</g>;
    default:
      return null;
  }
}

// =========================================================================
// Catalog
// =========================================================================

const item = (
  id: string,
  slot: GearSlot,
  name: string,
  price: number,
  value: string,
  rarity: Rarity = "common",
  levelReq?: number,
): GearItem => ({ id, slot, name, price, value, rarity, ...(levelReq ? { levelReq } : {}) });

export const GEAR: GearItem[] = [
  // skin (free — identity, not paywalled)
  ...Object.keys(SKIN_TONES).map((k, i) =>
    item(`skin-${k}`, "skin", titleCase(k), 0, k, "common", i === 0 ? undefined : undefined),
  ),
  // hair styles
  item("hair-ponytail", "hair", "Ponytail", 0, "ponytail"),
  item("hair-short", "hair", "Short & Tidy", 40, "short"),
  item("hair-twintails", "hair", "Twin Tails", 60, "twintails", "rare"),
  item("hair-bob", "hair", "Bob Cut", 50, "bob"),
  item("hair-puff", "hair", "Curly Puff", 60, "puff", "rare"),
  item("hair-long", "hair", "Long & Wavy", 80, "long", "rare"),
  // hair colors
  ...Object.keys(HAIR_COLORS).map((k, i) =>
    item(`hc-${k}`, "hairColor", titleCase(k), i < 4 ? 0 : 40, k, i >= 4 ? "rare" : "common"),
  ),
  // faces
  item("face-cheerful", "face", "Cheerful", 0, "cheerful"),
  item("face-determined", "face", "Determined", 40, "determined"),
  item("face-wink", "face", "Wink", 40, "wink"),
  item("face-starry", "face", "Starry-eyed", 90, "starry", "epic"),
  item("face-surprised", "face", "Surprised", 40, "surprised"),
  // outfits
  item("outfit-explorer", "outfit", "Explorer Kit", 0, "explorer"),
  item("outfit-hoodie", "outfit", "Cozy Hoodie", 60, "hoodie"),
  item("outfit-vest", "outfit", "Ranger Vest", 80, "vest", "rare"),
  item("outfit-sporty", "outfit", "Sporty Kit", 60, "sporty"),
  item("outfit-ninja", "outfit", "Ninja Gi", 90, "ninja", "rare"),
  item("outfit-princess", "outfit", "Royal Dress", 120, "princess", "rare"),
  item("outfit-hero", "outfit", "Hero Suit", 160, "hero", "epic", 2),
  item("outfit-space", "outfit", "Astro Suit", 220, "space", "epic", 3),
  // hats
  item("hat-none", "hat", "No Hat", 0, ""),
  item("hat-cap", "hat", "Quest Cap", 40, "cap"),
  item("hat-beanie", "hat", "Beanie", 40, "beanie"),
  item("hat-flower", "hat", "Flower Wreath", 70, "flower", "rare"),
  item("hat-party", "hat", "Party Cone", 60, "party"),
  item("hat-crown", "hat", "Golden Crown", 260, "crown", "legendary", 4),
  // accessories
  item("acc-none", "accessory", "None", 0, ""),
  item("acc-glasses", "accessory", "Round Glasses", 40, "glasses"),
  item("acc-backpack", "accessory", "Trail Pack", 50, "backpack"),
  item("acc-badge", "accessory", "Star Badge", 40, "badge"),
  item("acc-cape", "accessory", "Hero Cape", 150, "cape", "epic", 2),
  item("acc-wings", "accessory", "Star Wings", 240, "wings", "legendary", 4),
  // pets
  item("pet-none", "pet", "No Pet", 0, ""),
  item("pet-slime", "pet", "Slimeling", 70, "slime"),
  item("pet-cat", "pet", "Kitten", 70, "cat"),
  item("pet-pup", "pet", "Puppy", 70, "pup"),
  item("pet-fox", "pet", "Fox Cub", 110, "fox", "rare"),
  item("pet-owl", "pet", "Wise Owl", 110, "owl", "rare"),
  item("pet-bunny", "pet", "Bunny", 80, "bunny"),
  item("pet-dragon", "pet", "Dragonling", 260, "dragon", "legendary", 4),
  // scenes
  item("scene-command", "scene", "Command Deck", 0, "command"),
  item("scene-sky", "scene", "Daydream Sky", 40, "sky"),
  item("scene-beach", "scene", "Sunset Beach", 50, "beach"),
  item("scene-forest", "scene", "Whispering Woods", 50, "forest"),
  item("scene-space", "scene", "Deep Space", 70, "space", "rare"),
  item("scene-neon", "scene", "Neon City", 90, "neon", "rare"),
  item("scene-candy", "scene", "Candy Clouds", 60, "candy"),
  item("scene-aurora", "scene", "Aurora", 90, "aurora", "epic"),
];

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const GEAR_BY_ID: Record<string, GearItem> = Object.fromEntries(
  GEAR.map((g) => [g.id, g]),
);

export const DEFAULT_GEAR: Record<GearSlot, GearItem> = Object.fromEntries(
  SLOT_META.map((s) => [
    s.slot,
    GEAR.find((g) => g.slot === s.slot && g.price === 0)!,
  ]),
) as Record<GearSlot, GearItem>;

// Claire's premium default: warm explorer with an auburn ponytail + quest cap.
const CLAIRE_DEFAULT: AvatarConfig = {
  skin: "skin-light",
  hair: "hair-ponytail",
  hairColor: "hc-auburn",
  face: "face-cheerful",
  outfit: "outfit-explorer",
  hat: "hat-cap",
  accessory: "acc-backpack",
  pet: "pet-none",
  scene: "scene-command",
};

export function defaultAvatarConfig(): AvatarConfig {
  return { ...CLAIRE_DEFAULT };
}

function valueOf(config: AvatarConfig, slot: GearSlot): string {
  const id = config[slot];
  return ((id && GEAR_BY_ID[id]) || DEFAULT_GEAR[slot]).value;
}

export const RARITY_META: Record<Rarity, { label: string; color: string }> = {
  common: { label: "Common", color: "#8b93a7" },
  rare: { label: "Rare", color: "#39b7ff" },
  epic: { label: "Epic", color: "#c264ff" },
  legendary: { label: "Legendary", color: "#ffc23d" },
};

// =========================================================================
// Avatar component
// =========================================================================

export function Avatar({
  config,
  size = 120,
  animated = false,
  showScene = false,
  className,
}: {
  config: AvatarConfig;
  size?: number;
  animated?: boolean;
  showScene?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const eyeId = `eye-${uid}`;
  const bgId = `scn-${uid}`;

  const skin = skinOf(valueOf(config, "skin"));
  const hair = hairOf(valueOf(config, "hairColor"));
  const hairStyle = valueOf(config, "hair");
  const face = valueOf(config, "face");
  const outfit = valueOf(config, "outfit");
  const hat = valueOf(config, "hat");
  const acc = valueOf(config, "accessory");
  const pet = valueOf(config, "pet");
  const scene = SCENES[valueOf(config, "scene")] ?? SCENES.command;

  return (
    <svg
      className={`avatar ${animated ? "avatar--live" : ""} ${className ?? ""}`}
      viewBox="0 0 300 340"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar"
    >
      <defs>
        <linearGradient id={eyeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1622" />
          <stop offset="100%" stopColor="#5c3342" />
        </linearGradient>
        <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scene.stops[0]} />
          <stop offset="100%" stopColor={scene.stops[1]} />
        </linearGradient>
      </defs>

      {showScene && (
        <rect x="0" y="0" width="300" height="340" rx="26" fill={`url(#${bgId})`} />
      )}

      {renderPet(pet)}

      <g className="av-breathe">
        {renderHairBack(hairStyle, hair)}
        {renderAccessory(acc, "back")}
        {renderOutfit(outfit, skin)}

        <g className="av-head">
          {/* neck */}
          <path d="M136 198 l28 0 -2 22 q-12 6 -24 0 z" fill={skin.base} stroke={LINE} strokeWidth={LW} strokeLinejoin="round" />
          <path d="M136 200 l28 0 -1 8 q-13 5 -26 0 z" fill={skin.shade} opacity="0.45" />
          {/* ears */}
          <ellipse cx={76} cy={130} rx={11} ry={15} fill={skin.base} stroke={LINE} strokeWidth={LW} />
          <ellipse cx={224} cy={130} rx={11} ry={15} fill={skin.base} stroke={LINE} strokeWidth={LW} />
          <ellipse cx={78} cy={130} rx={5} ry={8} fill={skin.shade} opacity="0.6" />
          <ellipse cx={222} cy={130} rx={5} ry={8} fill={skin.shade} opacity="0.6" />
          {/* head */}
          <path
            d="M75 120 C75 68 110 40 150 40 C190 40 225 68 225 120 C225 166 200 206 150 206 C100 206 75 166 75 120 Z"
            fill={skin.base}
            stroke={LINE}
            strokeWidth={LW}
            strokeLinejoin="round"
          />
          {/* form shadows */}
          <path d="M150 196 q40 0 60 -28 q-12 34 -60 38 q-48 -4 -60 -38 q20 28 60 28 z" fill={skin.shade} opacity="0.32" />
          <path d="M210 92 q12 30 -2 64 q22 -34 2 -64 z" fill={skin.shade} opacity="0.22" />

          <g className="av-eyes">{renderFace(face, eyeId)}</g>

          {renderHairFront(hairStyle, hair)}
          <g className="av-hat">{renderHat(hat)}</g>
        </g>

        {renderAccessory(acc, "front")}
      </g>
    </svg>
  );
}
