import { useId } from "react";
import type { AvatarConfig, GearItem, GearSlot } from "../types";

/**
 * The avatar dress-up system: a buildable cartoon character whose pieces are
 * unlocked with coins (earned from approved tasks). The <Avatar> component
 * composes the equipped gear into one flat SVG, shown across the app.
 */

/** Coins every kid starts with, so the first piece is one task away. */
export const STARTER_COINS = 50;

export const SLOT_META: { slot: GearSlot; label: string; emoji: string }[] = [
  { slot: "color", label: "Skin", emoji: "🎨" },
  { slot: "outfit", label: "Outfit", emoji: "👕" },
  { slot: "hat", label: "Hat", emoji: "🧢" },
  { slot: "face", label: "Face", emoji: "🕶️" },
  { slot: "pet", label: "Pet", emoji: "🐾" },
  { slot: "background", label: "Scene", emoji: "🖼️" },
];

export const GEAR: GearItem[] = [
  // --- skin / body color --------------------------------------------------
  { id: "color-peach", slot: "color", name: "Peach", price: 0, icon: "🎨", value: "#f7c89b" },
  { id: "color-tan", slot: "color", name: "Tan", price: 20, icon: "🎨", value: "#e0a26a" },
  { id: "color-cocoa", slot: "color", name: "Cocoa", price: 20, icon: "🎨", value: "#a9744f" },
  { id: "color-mint", slot: "color", name: "Mint", price: 40, icon: "🎨", value: "#8fe3bf" },
  { id: "color-sky", slot: "color", name: "Sky", price: 40, icon: "🎨", value: "#93c5fd" },
  { id: "color-lilac", slot: "color", name: "Lilac", price: 50, icon: "🎨", value: "#c4b5fd" },
  { id: "color-bubblegum", slot: "color", name: "Bubblegum", price: 50, icon: "🎨", value: "#fda4d4" },

  // --- outfit -------------------------------------------------------------
  { id: "outfit-none", slot: "outfit", name: "Just me", price: 0, icon: "🚫", value: "" },
  { id: "outfit-red", slot: "outfit", name: "Red Tee", price: 20, icon: "👕", value: "#ef4444" },
  { id: "outfit-blue", slot: "outfit", name: "Blue Tee", price: 20, icon: "👕", value: "#2563eb" },
  { id: "outfit-green", slot: "outfit", name: "Green Hoodie", price: 35, icon: "🧥", value: "#16a34a" },
  { id: "outfit-purple", slot: "outfit", name: "Purple", price: 45, icon: "👕", value: "#7c3aed" },
  { id: "outfit-gold", slot: "outfit", name: "Golden", price: 80, icon: "✨", value: "#f59e0b" },
  { id: "outfit-cape", slot: "outfit", name: "Hero Cape", price: 150, levelReq: 2, icon: "🦸", value: "cape" },

  // --- hat ----------------------------------------------------------------
  { id: "hat-none", slot: "hat", name: "No hat", price: 0, icon: "🚫", value: "" },
  { id: "hat-cap", slot: "hat", name: "Ball Cap", price: 30, icon: "🧢", value: "🧢" },
  { id: "hat-bow", slot: "hat", name: "Bow", price: 30, icon: "🎀", value: "🎀" },
  { id: "hat-sun", slot: "hat", name: "Sun Hat", price: 40, icon: "👒", value: "👒" },
  { id: "hat-grad", slot: "hat", name: "Grad Cap", price: 60, icon: "🎓", value: "🎓" },
  { id: "hat-top", slot: "hat", name: "Top Hat", price: 90, icon: "🎩", value: "🎩" },
  { id: "hat-crown", slot: "hat", name: "Crown", price: 160, levelReq: 3, icon: "👑", value: "👑" },

  // --- face ---------------------------------------------------------------
  { id: "face-none", slot: "face", name: "Plain", price: 0, icon: "🚫", value: "" },
  { id: "face-glasses", slot: "face", name: "Glasses", price: 30, icon: "👓", value: "👓" },
  { id: "face-shades", slot: "face", name: "Shades", price: 50, icon: "🕶️", value: "🕶️" },
  { id: "face-goggles", slot: "face", name: "Goggles", price: 45, icon: "🥽", value: "🥽" },
  { id: "face-disguise", slot: "face", name: "Disguise", price: 70, icon: "🥸", value: "🥸" },

  // --- pet ----------------------------------------------------------------
  { id: "pet-none", slot: "pet", name: "No pet", price: 0, icon: "🚫", value: "" },
  { id: "pet-cat", slot: "pet", name: "Kitten", price: 60, icon: "🐱", value: "🐱" },
  { id: "pet-dog", slot: "pet", name: "Puppy", price: 60, icon: "🐶", value: "🐶" },
  { id: "pet-bunny", slot: "pet", name: "Bunny", price: 70, icon: "🐰", value: "🐰" },
  { id: "pet-parrot", slot: "pet", name: "Parrot", price: 90, icon: "🦜", value: "🦜" },
  { id: "pet-robot", slot: "pet", name: "Robo-pal", price: 150, levelReq: 2, icon: "🤖", value: "🤖" },
  { id: "pet-unicorn", slot: "pet", name: "Unicorn", price: 200, levelReq: 3, icon: "🦄", value: "🦄" },
  { id: "pet-dragon", slot: "pet", name: "Dragon", price: 260, levelReq: 4, icon: "🐉", value: "🐉" },

  // --- background scene ---------------------------------------------------
  { id: "bg-plain", slot: "background", name: "Plain", price: 0, icon: "⬜", value: "plain" },
  { id: "bg-sky", slot: "background", name: "Blue Sky", price: 30, icon: "🌤️", value: "sky" },
  { id: "bg-sunset", slot: "background", name: "Sunset", price: 50, icon: "🌇", value: "sunset" },
  { id: "bg-beach", slot: "background", name: "Beach", price: 50, icon: "🏖️", value: "beach" },
  { id: "bg-forest", slot: "background", name: "Forest", price: 50, icon: "🌲", value: "forest" },
  { id: "bg-space", slot: "background", name: "Outer Space", price: 70, icon: "🌌", value: "space" },
  { id: "bg-neon", slot: "background", name: "Neon City", price: 90, levelReq: 2, icon: "🌃", value: "neon" },
  { id: "bg-rainbow", slot: "background", name: "Rainbow", price: 120, levelReq: 3, icon: "🌈", value: "rainbow" },
];

export const GEAR_BY_ID: Record<string, GearItem> = Object.fromEntries(
  GEAR.map((g) => [g.id, g]),
);

/** The free, always-owned default item for each slot. */
export const DEFAULT_GEAR: Record<GearSlot, GearItem> = Object.fromEntries(
  SLOT_META.map((s) => [
    s.slot,
    GEAR.find((g) => g.slot === s.slot && g.price === 0)!,
  ]),
) as Record<GearSlot, GearItem>;

export function defaultAvatarConfig(): AvatarConfig {
  return Object.fromEntries(
    SLOT_META.map((s) => [s.slot, DEFAULT_GEAR[s.slot].id]),
  );
}

/** Resolve the equipped item for a slot, falling back to the free default. */
function itemFor(config: AvatarConfig, slot: GearSlot): GearItem {
  const id = config[slot];
  return (id && GEAR_BY_ID[id]) || DEFAULT_GEAR[slot];
}

const BG_STOPS: Record<string, [string, string]> = {
  plain: ["#eef1f7", "#e5e9f2"],
  sky: ["#bfe3ff", "#eaf6ff"],
  sunset: ["#ffd29a", "#ffb3c6"],
  beach: ["#ffe9b0", "#a9e7ff"],
  forest: ["#c5edc6", "#8ad0a0"],
  space: ["#2b2350", "#0e0b22"],
  neon: ["#2a0e3a", "#063049"],
};

/** Composited avatar built from the equipped gear. */
export function Avatar({
  config,
  size = 120,
  className,
}: {
  config: AvatarConfig;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const skin = itemFor(config, "color").value;
  const outfit = itemFor(config, "outfit").value;
  const hat = itemFor(config, "hat").value;
  const face = itemFor(config, "face").value;
  const pet = itemFor(config, "pet").value;
  const bg = itemFor(config, "background").value;

  const isCape = outfit === "cape";
  const torso = isCape ? "#ef4444" : outfit || skin;
  const stops = BG_STOPS[bg] ?? BG_STOPS.plain;
  const bgId = `bg-${uid}`;

  const emoji = (e: string, x: number, y: number, s: number) =>
    e ? (
      <text
        x={x}
        y={y}
        fontSize={s}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {e}
      </text>
    ) : null;

  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Avatar"
    >
      <defs>
        {bg === "rainbow" ? (
          <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff9aa2" />
            <stop offset="35%" stopColor="#ffd59e" />
            <stop offset="65%" stopColor="#a0e7c0" />
            <stop offset="100%" stopColor="#b5c7ff" />
          </linearGradient>
        ) : (
          <linearGradient id={bgId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stops[0]} />
            <stop offset="100%" stopColor={stops[1]} />
          </linearGradient>
        )}
      </defs>

      <rect x="0" y="0" width="200" height="200" rx="24" fill={`url(#${bgId})`} />

      {/* ground shadow */}
      <ellipse cx="100" cy="184" rx="44" ry="8" fill="rgba(0,0,0,0.12)" />

      {/* hero cape behind the body */}
      {isCape && (
        <path d="M70 116 Q100 210 130 116 L120 120 Q100 150 80 120 Z" fill="#dc2626" />
      )}

      {/* legs / feet */}
      <ellipse cx="86" cy="176" rx="11" ry="9" fill={skin} />
      <ellipse cx="114" cy="176" rx="11" ry="9" fill={skin} />

      {/* torso */}
      <path
        d="M66 138 q0 -26 34 -26 q34 0 34 26 l0 30 q0 14 -16 14 l-36 0 q-16 0 -16 -14 z"
        fill={torso}
      />
      {/* arms (skin) */}
      <ellipse cx="62" cy="146" rx="10" ry="16" fill={skin} />
      <ellipse cx="138" cy="146" rx="10" ry="16" fill={skin} />

      {/* head */}
      <circle cx="100" cy="86" r="46" fill={skin} />
      {/* cheeks */}
      <circle cx="78" cy="98" r="7" fill="rgba(255,120,150,0.35)" />
      <circle cx="122" cy="98" r="7" fill="rgba(255,120,150,0.35)" />
      {/* eyes */}
      <circle cx="86" cy="84" r="6" fill="#2a2233" />
      <circle cx="114" cy="84" r="6" fill="#2a2233" />
      <circle cx="88" cy="82" r="2" fill="#fff" />
      <circle cx="116" cy="82" r="2" fill="#fff" />
      {/* smile */}
      <path
        d="M86 102 q14 12 28 0"
        fill="none"
        stroke="#2a2233"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* face accessory (glasses etc.) over the eyes */}
      {emoji(face, 100, 86, 44)}
      {/* hat on top of the head */}
      {emoji(hat, 100, 44, 54)}
      {/* sidekick pet */}
      {emoji(pet, 168, 168, 40)}
    </svg>
  );
}
