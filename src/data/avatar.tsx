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
  { slot: "bodyType", label: "Body", emoji: "🧍" },
  { slot: "skin", label: "Skin", emoji: "✋" },
  { slot: "hair", label: "Hair", emoji: "💇" },
  { slot: "eyeShape", label: "Eyes", emoji: "👁️" },
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

export const EYE_COLORS: Record<string, { base: string; deep: string }> = {
  brown: { base: "#9c5e2e", deep: "#5e3414" },
  amber: { base: "#e0a23a", deep: "#a86a18" },
  hazel: { base: "#8a7a3a", deep: "#5a4a1e" },
  blue: { base: "#3f8fe0", deep: "#1f56a6" },
  teal: { base: "#26b3a6", deep: "#147a70" },
  green: { base: "#46ad62", deep: "#1f7a40" },
  violet: { base: "#9a6ae0", deep: "#6638ae" },
  pink: { base: "#ff7aa8", deep: "#d4487a" },
  red: { base: "#e0513a", deep: "#a82c1c" },
  grey: { base: "#8b95a6", deep: "#5a626e" },
};

const skinOf = (id: string): Tone => SKIN_TONES[id] ?? SKIN_TONES.light;
const hairOf = (id: string): Hair => HAIR_COLORS[id] ?? HAIR_COLORS.brown;
const eyeOf = (id: string) => EYE_COLORS[id] ?? EYE_COLORS.brown;

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

/** The open-eye outline for an eye-shape, centered at cx. */
function eyeOpening(cx: number, shape: string): string {
  switch (shape) {
    case "wide":
      return `M${cx - 20} 138 C${cx - 20} 113 ${cx - 10} 107 ${cx} 107 C${cx + 10} 107 ${cx + 20} 113 ${cx + 20} 138 C${cx + 20} 164 ${cx + 10} 174 ${cx} 174 C${cx - 10} 174 ${cx - 20} 164 ${cx - 20} 138 Z`;
    case "sharp":
      return `M${cx - 20} 132 Q${cx - 15} 118 ${cx} 117 Q${cx + 15} 118 ${cx + 20} 132 Q${cx + 14} 160 ${cx} 166 Q${cx - 14} 160 ${cx - 20} 132 Z`;
    case "gentle":
      return `M${cx - 16} 142 C${cx - 16} 126 ${cx - 8} 122 ${cx} 122 C${cx + 8} 122 ${cx + 16} 126 ${cx + 16} 142 C${cx + 16} 160 ${cx + 8} 168 ${cx} 168 C${cx - 8} 168 ${cx - 16} 160 ${cx - 16} 142 Z`;
    default: // round
      return `M${cx - 17} 138 C${cx - 17} 116 ${cx - 9} 111 ${cx} 111 C${cx + 9} 111 ${cx + 17} 116 ${cx + 17} 138 C${cx + 17} 162 ${cx + 9} 172 ${cx} 172 C${cx - 9} 172 ${cx - 17} 162 ${cx - 17} 138 Z`;
  }
}

/** Big anime eyes (colored iris, pupil, highlights, lashes) + nose/mouth. */
function renderFace(
  face: string,
  eyeShape: string,
  eyeGradId: string,
  lashes: boolean,
) {
  const eye = (cx: number) => {
    const outer = cx > 150 ? 1 : -1;
    if (face === "wink" && cx > 150) {
      return (
        <path
          key={cx}
          d={`M${cx - 17} 140 q17 -16 34 0`}
          fill="none"
          stroke={LINE}
          strokeWidth="6"
          strokeLinecap="round"
        />
      );
    }
    const path = eyeOpening(cx, face === "surprised" ? "wide" : eyeShape);
    return (
      <g key={cx}>
        {/* iris (the colored eye fill) */}
        <path d={path} fill={`url(#${eyeGradId})`} stroke={LINE} strokeWidth="2.6" strokeLinejoin="round" />
        {/* bright lower rim */}
        <ellipse cx={cx} cy={160} rx={11} ry={6} fill="#fff" opacity="0.28" />
        {/* pupil */}
        <ellipse cx={cx} cy={141} rx={7.5} ry={10} fill="#23121b" />
        {face === "starry" ? (
          t("⭐", cx, 140, 17)
        ) : (
          <>
            <ellipse cx={cx - 5} cy={129} rx={6} ry={8} fill="#fff" />
            <circle cx={cx + 6} cy={153} r={3} fill="#fff" opacity="0.9" />
          </>
        )}
        {/* thick upper lash */}
        <path d={`M${cx - 20} 126 Q${cx} 108 ${cx + 20} 126 Q${cx} 117 ${cx - 20} 126 Z`} fill={LINE} />
        {/* outer corner flick */}
        <path
          d={`M${cx + outer * 18} 124 q${outer * 9} -3 ${outer * 13} 4`}
          stroke={LINE}
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
        {/* lower lashes (girls) */}
        {lashes && (
          <path
            d={`M${cx + outer * 15} 162 l${outer * 7} 6`}
            stroke={LINE}
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        )}
      </g>
    );
  };

  const brows = lashes ? null : face === "determined" ? (
    <>
      <path d="M104 106 l28 7" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
      <path d="M196 106 l-28 7" stroke={LINE} strokeWidth="5" strokeLinecap="round" />
    </>
  ) : (
    <>
      <path d="M104 104 q14 -4 26 0" stroke={LINE} strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <path d="M196 104 q-14 -4 -26 0" stroke={LINE} strokeWidth="4.5" strokeLinecap="round" fill="none" />
    </>
  );

  const mouth =
    face === "surprised" ? (
      <ellipse cx={150} cy={172} rx={7} ry={9} fill="#8a3f47" />
    ) : face === "determined" ? (
      <path d="M140 170 q10 6 20 0" fill="none" stroke="#8a3f47" strokeWidth="4" strokeLinecap="round" />
    ) : (
      <path d="M142 168 q8 9 16 0 q-8 4 -16 0 z" fill="#a8505a" />
    );

  return (
    <g>
      {brows}
      {eye(118)}
      {eye(182)}
      {/* tiny nose */}
      <ellipse cx={150} cy={156} rx={2.4} ry={1.6} fill="rgba(120,70,60,0.45)" />
      {mouth}
      {/* blush */}
      <ellipse cx={98} cy={158} rx={13} ry={7.5} fill="rgba(255,120,150,0.42)" />
      <ellipse cx={202} cy={158} rx={13} ry={7.5} fill="rgba(255,120,150,0.42)" />
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
          <path d="M210 112 q28 18 20 60" fill="none" stroke={c.dark} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
          <path d="M218 118 q26 18 18 56" fill="none" stroke={c.light} strokeWidth="6" strokeLinecap="round" opacity="0.6" />
        </g>
      );
    case "twintails":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M72 104 q-48 10 -42 76 q4 32 26 44 q-10 -10 -8 -28 q-12 -38 2 -64 q8 -22 30 -28 z" fill={c.base} />
          <path d="M228 104 q48 10 42 76 q-4 32 -26 44 q10 -10 8 -28 q12 -38 -2 -64 q-8 -22 -30 -28 z" fill={c.base} />
          <path d="M58 118 q-22 22 -14 64" fill="none" stroke={c.light} strokeWidth="5" strokeLinecap="round" opacity="0.6" />
          <path d="M242 118 q22 22 14 64" fill="none" stroke={c.light} strokeWidth="5" strokeLinecap="round" opacity="0.6" />
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
    case "spiky":
      return wrap(
        <>
          <path
            d="M66 122 C70 50 110 26 150 26 C190 26 230 50 234 122 L214 92 L206 120 L188 88 L176 120 L160 84 L150 116 L140 84 L124 120 L112 88 L94 120 L86 92 Z"
            fill={c.base}
          />
          {shine}
        </>,
      );
    case "fauxhawk":
      return wrap(
        <>
          <path
            d="M74 120 C76 70 110 40 150 40 C190 40 224 70 226 120 L210 110 L202 116 L192 74 L176 114 L164 58 L150 106 L136 58 L124 114 L108 74 L98 116 L90 110 Z"
            fill={c.base}
          />
          {shine}
        </>,
      );
    case "messy":
      return wrap(
        <>
          <path
            d="M62 126 C66 54 110 28 150 28 C190 28 234 54 238 126 L218 98 L208 124 L196 96 L182 122 L168 90 L154 118 L150 92 L146 118 L132 90 L118 122 L104 96 L92 124 L82 98 Z"
            fill={c.base}
          />
          {shine}
        </>,
      );
    case "buzz":
      return wrap(
        <>
          <path d="M78 116 C80 70 112 44 150 44 C188 44 220 70 222 116 q-72 -16 -144 0 z" fill={c.base} />
          {shine}
        </>,
      );
    case "sideswept":
      return wrap(
        <>
          <path
            d="M68 122 C70 56 110 30 150 30 C190 30 230 56 230 116 L196 104 L150 118 L120 122 L96 106 L82 124 Z"
            fill={c.base}
          />
          {shine}
        </>,
      );
    case "buns":
      return wrap(
        <>
          <circle cx={104} cy={40} r={21} fill={c.base} />
          <circle cx={196} cy={40} r={21} fill={c.base} />
          <path
            d="M72 120 C72 58 112 34 150 34 C188 34 228 58 228 120 L210 112 L202 126 L186 108 L172 124 L158 108 L150 122 L142 108 L128 124 L112 108 L96 126 L88 112 Z"
            fill={c.base}
          />
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
          {/* darker strand separations for layered locks */}
          <g stroke={c.dark} strokeWidth="2.5" fill="none" opacity="0.5" strokeLinecap="round">
            <path d="M120 46 q-12 34 -24 70" />
            <path d="M150 42 q-2 38 -1 76" />
            <path d="M180 46 q12 34 24 70" />
          </g>
          {shine}
          {/* lighter highlight strand */}
          <path d="M126 66 q22 -14 48 0" stroke={c.light} strokeWidth="3" fill="none" opacity="0.6" strokeLinecap="round" />
        </>,
      );
  }
}

/** Outfit: torso, collar, arms; lower body switches on girl/boy. */
function renderOutfit(key: string, skin: Tone, body: string) {
  const palettes: Record<string, { main: string; trim: string; pants: string; shoe: string; emblem?: string }> = {
    explorer: { main: "#2bb3a3", trim: "#f4a93c", pants: "#3a5a8c", shoe: "#f4f1ea", emblem: "#ffd23f" },
    hoodie: { main: "#7c5cff", trim: "#b9a6ff", pants: "#3a3550", shoe: "#22d3ee" },
    vest: { main: "#e2b04a", trim: "#7a4a22", pants: "#5a7d3a", shoe: "#6b4a2e" },
    hero: { main: "#ff4d6d", trim: "#ffd23f", pants: "#2a2350", shoe: "#ffd23f", emblem: "#fff" },
    space: { main: "#cfd6e6", trim: "#54a7ff", pants: "#aab4cc", shoe: "#3a4768", emblem: "#22d3ee" },
    sporty: { main: "#ef4444", trim: "#fff", pants: "#1f2733", shoe: "#fff", emblem: "#fff" },
    ninja: { main: "#2a2738", trim: "#54a7ff", pants: "#1a1622", shoe: "#2a2738", emblem: "#54a7ff" },
    princess: { main: "#ff8fc6", trim: "#ffe08a", pants: "#ffc2e0", shoe: "#fff", emblem: "#ffe08a" },
    varsity: { main: "#3a5a8c", trim: "#ffd23f", pants: "#2a2738", shoe: "#fff", emblem: "#ffd23f" },
    tracksuit: { main: "#22c3a6", trim: "#1f2733", pants: "#1f2733", shoe: "#fff", emblem: "#fff" },
    soccer: { main: "#16a34a", trim: "#fff", pants: "#fff", shoe: "#1f2733", emblem: "#fff" },
    camo: { main: "#5a6b3a", trim: "#3a4528", pants: "#3a4528", shoe: "#2a2738", emblem: "#cdd6a8" },
    skater: { main: "#3a3550", trim: "#ef4444", pants: "#1f2733", shoe: "#ef4444", emblem: "#ef4444" },
    knight: { main: "#9aa6b8", trim: "#ffd23f", pants: "#5a626e", shoe: "#3a4150", emblem: "#ffd23f" },
    kimono: { main: "#7c3a8c", trim: "#ffe08a", pants: "#3a2348", shoe: "#2a2030", emblem: "#ff8fc6" },
    sunny: { main: "#ffce4a", trim: "#ff8a3d", pants: "#ff8a3d", shoe: "#fff", emblem: "#fff" },
  };
  const p = palettes[key] ?? palettes.explorer;
  const sock = "#fbf7ff";
  const girlLower = (
    <>
      {/* socks + legs */}
      <path d="M132 298 l-3 26 q9 5 17 0 l-1 -26 z" fill={sock} />
      <path d="M155 298 l3 26 q-9 5 -17 0 l-1 -26 z" fill={sock} />
      {/* shoes */}
      <path d="M124 320 q-6 15 14 15 l16 0 0 -16 q-17 -2 -30 1 z" fill={p.shoe} />
      <path d="M176 320 q6 15 -14 15 l-16 0 0 -16 q17 -2 30 1 z" fill={p.shoe} />
      {/* pleated skirt */}
      <path d="M108 280 q42 17 84 0 l17 38 q-58 18 -118 0 z" fill={p.pants} />
      <path d="M134 288 l-7 30 M150 291 v30 M166 288 l7 30" stroke={LINE} strokeWidth="2" fill="none" opacity="0.45" />
    </>
  );
  const boyLower = (
    <>
      {/* sneakers */}
      <path d="M116 322 q-9 15 17 15 l20 0 0 -19 q-22 -2 -37 4 z" fill={p.shoe} />
      <path d="M184 322 q9 15 -17 15 l-20 0 0 -19 q22 -2 37 4 z" fill={p.shoe} />
      {/* full-length pants (two legs + inseam) */}
      <path d="M106 282 q44 17 88 0 l6 46 q-16 6 -32 2 l-6 -34 q-6 2 -12 0 l-6 34 q-16 4 -32 -2 z" fill={p.pants} />
      <path d="M150 296 v32" stroke={LINE} strokeWidth="2" opacity="0.4" />
    </>
  );
  const isBoy = body === "boy";
  return (
    <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round" strokeLinecap="round">
      {/* arms (behind torso) — broader, lower-hanging for boys */}
      <path
        d={
          isBoy
            ? "M104 228 q-30 12 -28 44 q1 16 17 20 q13 -3 13 -17 q-3 -30 -2 -47 z"
            : "M108 230 q-26 10 -24 40 q1 16 16 20 q12 -3 12 -16 q-2 -28 -4 -44 z"
        }
        fill={p.main}
      />
      <path
        d={
          isBoy
            ? "M196 228 q30 12 28 44 q-1 16 -17 20 q-13 -3 -13 -17 q3 -30 2 -47 z"
            : "M192 230 q26 10 24 40 q-1 16 -16 20 q-12 -3 -12 -16 q2 -28 4 -44 z"
        }
        fill={p.main}
      />
      {/* hands */}
      <circle cx={isBoy ? 88 : 90} cy={290} r={12} fill={skin.base} />
      <circle cx={isBoy ? 212 : 210} cy={290} r={12} fill={skin.base} />
      {isBoy ? boyLower : girlLower}
      {/* torso — squarer/broader for boys, softer waist for girls */}
      <path
        d={
          isBoy
            ? "M98 254 q2 -42 52 -42 q50 0 52 42 l1 30 q-53 16 -106 0 z"
            : "M104 252 q1 -38 46 -38 q45 0 46 38 l3 32 q-49 18 -98 0 z"
        }
        fill={p.main}
      />
      {/* torso shade */}
      <path d="M152 220 q38 6 42 58 q-20 10 -42 10 z" fill="rgba(0,0,0,0.1)" stroke="none" />
      {/* collar */}
      {isBoy ? (
        <path d="M124 212 l26 26 26 -26 -9 -6 -17 15 -17 -15 z" fill={p.trim} />
      ) : (
        <path d="M118 216 q32 -9 64 0 l-10 22 q-22 -7 -44 0 z" fill={p.trim} />
      )}
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
    case "ears":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M120 54 L88 18 L82 60 z" fill="#7a6a5e" />
          <path d="M180 54 L212 18 L218 60 z" fill="#7a6a5e" />
          <path d="M111 50 L93 28 L91 54 z" fill="#ffb3d1" stroke="none" />
          <path d="M189 50 L207 28 L209 54 z" fill="#ffb3d1" stroke="none" />
        </g>
      );
    case "snapback":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M88 76 q62 -42 124 0 q2 -42 -62 -42 q-64 0 -62 42 z" fill="#2a2738" />
          <path d="M86 76 q-30 0 -40 14 q34 8 56 -4 z" fill="#1f1c2c" />
          <rect x={132} y={44} width={36} height={20} rx={3} fill="#ef4444" />
        </g>
      );
    case "headband":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M74 98 q76 -20 152 0 l0 15 q-76 -19 -152 0 z" fill="#ef4444" />
          <path d="M224 102 l20 -7 -3 16 z" fill="#ef4444" />
          <rect x={140} y={101} width={20} height={9} rx={2} fill="#fff" stroke="none" />
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
        <g fill="none" stroke={LINE} strokeWidth="4">
          <circle cx={118} cy={140} r={22} />
          <circle cx={182} cy={140} r={22} />
          <path d="M140 138 h20" strokeLinecap="round" />
        </g>
      );
    case "headphones":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M80 116 Q150 36 220 116" fill="none" strokeWidth="9" strokeLinecap="round" />
          <rect x={68} y={112} width={24} height={34} rx={9} fill="#ff5a8a" />
          <rect x={208} y={112} width={24} height={34} rx={9} fill="#ff5a8a" />
        </g>
      );
    case "scarf":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M120 212 q30 16 60 0 l-3 16 q-27 12 -54 0 z" fill="#ef4444" />
          <path d="M166 224 l14 44 -20 -6 z" fill="#d23a3a" />
        </g>
      );
    case "sword":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M205 206 l10 0 -2 70 -6 0 z" fill="#dfe6f2" />
          <rect x={196} y={276} width={28} height={7} rx={3} fill="#caa05a" />
          <rect x={206} y={282} width={8} height={18} rx={3} fill="#7a4a22" />
        </g>
      );
    case "shield":
      return (
        <g stroke={LINE} strokeWidth={LW} strokeLinejoin="round">
          <path d="M66 262 q24 -10 48 0 l-5 32 q-19 16 -38 0 z" fill="#3a5a8c" />
          <path d="M90 270 v22 M77 281 h26" stroke="#ffd23f" strokeWidth="3.5" />
        </g>
      );
    case "badge":
      return <g transform="translate(104 268)">{t("⭐", 0, 0, 28)}</g>;
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
  // body type (free identity choice)
  item("body-girl", "bodyType", "Girl", 0, "girl"),
  item("body-boy", "bodyType", "Boy", 0, "boy"),
  // skin (free — identity, not paywalled)
  ...Object.keys(SKIN_TONES).map((k, i) =>
    item(`skin-${k}`, "skin", titleCase(k), 0, k, "common", i === 0 ? undefined : undefined),
  ),
  // hair styles
  // hair styles — free (part of who you are, not paywalled)
  item("hair-ponytail", "hair", "Ponytail", 0, "ponytail"),
  item("hair-short", "hair", "Short & Tidy", 0, "short"),
  item("hair-spiky", "hair", "Spiky", 0, "spiky"),
  item("hair-fauxhawk", "hair", "Faux Hawk", 0, "fauxhawk"),
  item("hair-messy", "hair", "Messy", 0, "messy"),
  item("hair-buzz", "hair", "Buzz Cut", 0, "buzz"),
  item("hair-sideswept", "hair", "Side Swept", 0, "sideswept"),
  item("hair-twintails", "hair", "Twin Tails", 0, "twintails"),
  item("hair-bob", "hair", "Bob Cut", 0, "bob"),
  item("hair-buns", "hair", "Double Buns", 0, "buns"),
  item("hair-puff", "hair", "Curly Puff", 0, "puff"),
  item("hair-long", "hair", "Long & Wavy", 0, "long"),
  // hair colors — free
  ...Object.keys(HAIR_COLORS).map((k) =>
    item(`hc-${k}`, "hairColor", titleCase(k), 0, k),
  ),
  // eye shapes — free
  item("es-round", "eyeShape", "Round", 0, "round"),
  item("es-wide", "eyeShape", "Wide", 0, "wide"),
  item("es-gentle", "eyeShape", "Gentle", 0, "gentle"),
  item("es-sharp", "eyeShape", "Sharp", 0, "sharp"),
  // eye colors — free
  ...Object.keys(EYE_COLORS).map((k) =>
    item(`ec-${k}`, "eyeColor", titleCase(k), 0, k),
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
  item("outfit-sunny", "outfit", "Summer Set", 50, "sunny"),
  item("outfit-soccer", "outfit", "Soccer Kit", 60, "soccer"),
  item("outfit-varsity", "outfit", "Varsity Jacket", 70, "varsity"),
  item("outfit-tracksuit", "outfit", "Track Suit", 60, "tracksuit"),
  item("outfit-skater", "outfit", "Skater Style", 70, "skater"),
  item("outfit-camo", "outfit", "Camo Gear", 80, "camo", "rare"),
  item("outfit-knight", "outfit", "Knight Armor", 130, "knight", "epic", 2),
  item("outfit-ninja", "outfit", "Ninja Gi", 90, "ninja", "rare"),
  item("outfit-princess", "outfit", "Royal Dress", 120, "princess", "rare"),
  item("outfit-kimono", "outfit", "Festival Kimono", 140, "kimono", "epic"),
  item("outfit-hero", "outfit", "Hero Suit", 160, "hero", "epic", 2),
  item("outfit-space", "outfit", "Astro Suit", 220, "space", "epic", 3),
  // hats
  item("hat-none", "hat", "No Hat", 0, ""),
  item("hat-cap", "hat", "Quest Cap", 40, "cap"),
  item("hat-beanie", "hat", "Beanie", 40, "beanie"),
  item("hat-snapback", "hat", "Snapback", 50, "snapback"),
  item("hat-headband", "hat", "Sport Headband", 40, "headband"),
  item("hat-flower", "hat", "Flower Wreath", 70, "flower", "rare"),
  item("hat-party", "hat", "Party Cone", 60, "party"),
  item("hat-ears", "hat", "Cat Ears", 80, "ears", "rare"),
  item("hat-crown", "hat", "Golden Crown", 260, "crown", "legendary", 4),
  // accessories
  item("acc-none", "accessory", "None", 0, ""),
  item("acc-glasses", "accessory", "Round Glasses", 40, "glasses"),
  item("acc-headphones", "accessory", "Headphones", 60, "headphones"),
  item("acc-backpack", "accessory", "Trail Pack", 50, "backpack"),
  item("acc-scarf", "accessory", "Cozy Scarf", 50, "scarf"),
  item("acc-badge", "accessory", "Star Badge", 40, "badge"),
  item("acc-sword", "accessory", "Hero Sword", 90, "sword", "rare"),
  item("acc-shield", "accessory", "Guard Shield", 90, "shield", "rare"),
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
  bodyType: "body-girl",
  skin: "skin-light",
  hair: "hair-ponytail",
  hairColor: "hc-auburn",
  eyeShape: "es-round",
  eyeColor: "ec-violet",
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
  const item = (id && GEAR_BY_ID[id]) || DEFAULT_GEAR[slot];
  return item ? item.value : "";
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

  const body = valueOf(config, "bodyType") === "boy" ? "boy" : "girl";
  const skin = skinOf(valueOf(config, "skin"));
  const hair = hairOf(valueOf(config, "hairColor"));
  const hairStyle = valueOf(config, "hair");
  const eyeCol = eyeOf(valueOf(config, "eyeColor"));
  const eyeShape = valueOf(config, "eyeShape");
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
          <stop offset="0%" stopColor={eyeCol.deep} />
          <stop offset="100%" stopColor={eyeCol.base} />
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
        {renderOutfit(outfit, skin, body)}

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

          <g className="av-eyes">{renderFace(face, eyeShape, eyeId, body === "girl")}</g>

          {renderHairFront(hairStyle, hair)}
          <g className="av-hat">{renderHat(hat)}</g>
        </g>

        {renderAccessory(acc, "front")}
      </g>
    </svg>
  );
}
