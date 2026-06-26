import { useId } from "react";
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

/** Eyes + brows + mouth for an expression. Iris color is a warm default. */
function renderFace(face: string, irisId: string) {
  const eye = (cx: number, variant: string) => {
    if (variant === "wink" && cx > 150) {
      // closed/wink eye → a happy upward arc
      return (
        <path
          key={cx}
          d={`M${cx - 16} 136 q16 -16 32 0`}
          fill="none"
          stroke="#2a2233"
          strokeWidth="5"
          strokeLinecap="round"
        />
      );
    }
    const starry = variant === "starry";
    return (
      <g key={cx}>
        <ellipse cx={cx} cy={134} rx={17} ry={20} fill="#fff" />
        <ellipse cx={cx} cy={136} rx={14.5} ry={17.5} fill={`url(#${irisId})`} />
        <ellipse cx={cx} cy={139} rx={8} ry={10} fill="#241c2e" />
        {starry ? (
          t("⭐", cx, 135, 16)
        ) : (
          <>
            <circle cx={cx - 5} cy={128} r={5.5} fill="#fff" />
            <circle cx={cx + 5} cy={143} r={3} fill="rgba(255,255,255,0.85)" />
          </>
        )}
        {/* upper lash line */}
        <path
          d={`M${cx - 18} 122 q18 -10 36 0 q-4 6 -8 5 q-10 -7 -28 -2 z`}
          fill="#2a2233"
        />
      </g>
    );
  };

  const brows =
    face === "determined" ? (
      <>
        <path d="M104 108 l28 6" stroke="#3a2f46" strokeWidth="5" strokeLinecap="round" />
        <path d="M196 108 l-28 6" stroke="#3a2f46" strokeWidth="5" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M106 106 q14 -6 26 -1" fill="none" stroke="#3a2f46" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M194 106 q-14 -6 -26 -1" fill="none" stroke="#3a2f46" strokeWidth="4.5" strokeLinecap="round" />
      </>
    );

  const mouth =
    face === "surprised" ? (
      <ellipse cx={150} cy={172} rx={9} ry={11} fill="#9c4a4a" />
    ) : face === "determined" ? (
      <path d="M136 170 q14 8 28 0" fill="none" stroke="#7a3b3b" strokeWidth="4.5" strokeLinecap="round" />
    ) : (
      <path d="M134 168 q16 18 32 0 q-16 6 -32 0 z" fill="#9c4a4a" />
    );

  return (
    <g>
      {brows}
      {eye(122, face)}
      {eye(178, face)}
      {/* nose */}
      <path d="M148 154 q2 5 4 0" fill="none" stroke="rgba(120,80,60,0.5)" strokeWidth="2.5" strokeLinecap="round" />
      {mouth}
      {/* blush */}
      <ellipse cx={104} cy={158} rx={13} ry={7} fill="rgba(255,120,150,0.38)" />
      <ellipse cx={196} cy={158} rx={13} ry={7} fill="rgba(255,120,150,0.38)" />
    </g>
  );
}

/** Back hair (behind head/body), per style. */
function renderHairBack(style: string, c: Hair) {
  switch (style) {
    case "ponytail":
      return (
        <g>
          <path d="M205 96 q58 18 40 86 q-8 34 -30 44 q16 -40 4 -74 q-8 -24 -28 -36 z" fill={c.base} />
          <path d="M210 110 q34 18 26 60" fill="none" stroke={c.light} strokeWidth="6" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case "twintails":
      return (
        <g>
          <path d="M74 104 q-44 8 -40 70 q4 30 24 40 q-12 -36 0 -64 q8 -22 26 -30 z" fill={c.base} />
          <path d="M226 104 q44 8 40 70 q-4 30 -24 40 q12 -36 0 -64 q-8 -22 -26 -30 z" fill={c.base} />
        </g>
      );
    case "bob":
      return <path d="M70 110 q-6 70 18 96 l124 0 q24 -26 18 -96 z" fill={c.dark} />;
    case "puff":
      return (
        <g fill={c.base}>
          <circle cx={150} cy={70} r={64} />
          <circle cx={92} cy={108} r={34} />
          <circle cx={208} cy={108} r={34} />
        </g>
      );
    case "long":
      return <path d="M66 108 q-12 96 16 130 l136 0 q28 -34 16 -130 z" fill={c.base} />;
    default: // short
      return <path d="M84 78 q66 -36 132 0 q10 40 -2 60 l-128 0 q-12 -20 -2 -60 z" fill={c.dark} />;
  }
}

/** Front hair / bangs, per style. */
function renderHairFront(style: string, c: Hair) {
  const sheen = (
    <path d="M104 64 q40 -22 92 0" fill="none" stroke={c.light} strokeWidth="7" strokeLinecap="round" opacity="0.65" />
  );
  switch (style) {
    case "puff":
      return (
        <g>
          <path d="M88 92 q62 -54 124 0 q-10 16 -22 14 q-40 -30 -80 0 q-12 2 -22 -14 z" fill={c.base} />
          {sheen}
        </g>
      );
    case "bob":
      return (
        <g>
          <path d="M74 104 q4 -78 76 -78 q72 0 76 78 q-22 -40 -50 -30 q-6 22 -16 24 q-8 -4 -10 -22 q-30 -8 -50 26 q-12 2 -26 2 z" fill={c.base} />
          {sheen}
        </g>
      );
    default:
      // tidy swept fringe (ponytail / short / twintails / long share it)
      return (
        <g>
          <path
            d="M72 112 q-2 -76 78 -78 q80 2 78 78 q-20 -46 -52 -34 q-4 20 -16 24 q-10 -2 -14 -22 q-34 -10 -56 28 q-10 4 -18 4 z"
            fill={c.base}
          />
          <path d="M150 36 q26 2 40 28 q-22 -14 -40 -10 q-18 -4 -40 10 q14 -26 40 -28 z" fill={c.light} opacity="0.55" />
          {sheen}
        </g>
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
  return (
    <g>
      {/* legs */}
      <rect x={128} y={296} width={18} height={26} rx={8} fill={skin.base} />
      <rect x={154} y={296} width={18} height={26} rx={8} fill={skin.base} />
      {/* shorts */}
      <path d="M118 286 q32 16 64 0 l4 18 q-36 14 -72 0 z" fill={p.pants} />
      {/* shoes */}
      <path d="M122 320 q-2 14 16 14 l12 0 0 -16 z" fill={p.shoe} />
      <path d="M178 320 q2 14 -16 14 l-12 0 0 -16 z" fill={p.shoe} />
      <rect x={120} y={330} width={32} height={5} rx={2.5} fill="rgba(0,0,0,0.18)" />
      <rect x={148} y={330} width={32} height={5} rx={2.5} fill="rgba(0,0,0,0.18)" />
      {/* torso */}
      <path d="M150 220 q-44 8 -50 40 l-6 34 q56 22 112 0 l-6 -34 q-6 -32 -50 -40 z" fill={p.main} />
      {/* torso shading */}
      <path d="M150 224 q34 6 44 36 l4 26 q-24 10 -48 10 z" fill="rgba(0,0,0,0.1)" />
      {/* collar */}
      <path d="M128 224 q22 18 44 0 l-8 -8 q-14 8 -28 0 z" fill={p.trim} />
      {/* sleeves */}
      <ellipse cx={96} cy={246} rx={16} ry={20} fill={p.main} />
      <ellipse cx={204} cy={246} rx={16} ry={20} fill={p.main} />
      {/* hands */}
      <circle cx={92} cy={276} r={13} fill={skin.base} />
      <circle cx={208} cy={276} r={13} fill={skin.base} />
      {/* forearm */}
      <rect x={86} y={258} width={12} height={20} rx={6} fill={skin.base} />
      <rect x={202} y={258} width={12} height={20} rx={6} fill={skin.base} />
      {p.emblem && <path d="M150 250 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1 z" fill={p.emblem} />}
    </g>
  );
}

function renderHat(key: string) {
  switch (key) {
    case "cap":
      return (
        <g>
          <path d="M92 78 q58 -44 116 0 q4 -44 -58 -44 q-62 0 -58 44 z" fill="#ff5a8a" />
          <path d="M88 78 q-22 4 -30 16 q26 6 44 -4 z" fill="#e23e72" />
          <circle cx={150} cy={40} r={6} fill="#ffd23f" />
        </g>
      );
    case "beanie":
      return (
        <g>
          <path d="M84 86 q4 -56 66 -56 q62 0 66 56 q-66 18 -132 0 z" fill="#54a7ff" />
          <rect x={84} y={80} width={132} height={14} rx={7} fill="#2f7fd6" />
          <circle cx={150} cy={26} r={9} fill="#cfe6ff" />
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
  const irisId = `iris-${uid}`;
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
        <linearGradient id={irisId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6b4a2e" />
          <stop offset="60%" stopColor="#a9743f" />
          <stop offset="100%" stopColor="#e7b066" />
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
          <path d="M136 198 l28 0 -2 22 q-12 6 -24 0 z" fill={skin.base} />
          <path d="M136 200 l28 0 -1 8 q-13 5 -26 0 z" fill={skin.shade} opacity="0.45" />
          {/* head */}
          <path
            d="M75 120 C75 68 110 40 150 40 C190 40 225 68 225 120 C225 166 200 206 150 206 C100 206 75 166 75 120 Z"
            fill={skin.base}
          />
          {/* ears */}
          <ellipse cx={76} cy={130} rx={11} ry={15} fill={skin.base} />
          <ellipse cx={224} cy={130} rx={11} ry={15} fill={skin.base} />
          <ellipse cx={78} cy={130} rx={5} ry={8} fill={skin.shade} opacity="0.6" />
          <ellipse cx={222} cy={130} rx={5} ry={8} fill={skin.shade} opacity="0.6" />
          {/* form shadows */}
          <path d="M150 196 q40 0 60 -28 q-12 34 -60 38 q-48 -4 -60 -38 q20 28 60 28 z" fill={skin.shade} opacity="0.35" />
          <path d="M210 92 q12 30 -2 64 q22 -34 2 -64 z" fill={skin.shade} opacity="0.25" />

          <g className="av-eyes">{renderFace(face, irisId)}</g>

          {renderHairFront(hairStyle, hair)}
          <g className="av-hat">{renderHat(hat)}</g>
        </g>

        {renderAccessory(acc, "front")}
      </g>
    </svg>
  );
}
