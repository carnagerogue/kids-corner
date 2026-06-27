// ---------------------------------------------------------------------------
// avatarDefaults — UI configuration + the default loadout for a new learner.
// ---------------------------------------------------------------------------
import type { Avatar3DSlot, Loadout3D } from "../../types";
import type { AvatarItem, Rarity3D } from "./avatarTypes";

/** Where a brand-new learner starts (all free items). */
export const DEFAULT_LOADOUT: Loadout3D = {
  base: "neutral-base-01",
  skinTone: "skin-warm",
  eyeColor: "eyes-brown",
  hairStyle: "hair-short",
  hairColor: "hcolor-brown",
  outfit: "starter-hoodie",
  shoes: "sneakers",
  room: "space-bedroom",
  animation: "idle-happy",
};

/** Per-rarity look: frame color, soft glow, and label. */
export const RARITY_META: Record<
  Rarity3D,
  { label: string; color: string; glow: string }
> = {
  common: { label: "Common", color: "#9aa7b5", glow: "rgba(154,167,181,0.45)" },
  uncommon: { label: "Uncommon", color: "#4ade80", glow: "rgba(74,222,128,0.5)" },
  rare: { label: "Rare", color: "#38bdf8", glow: "rgba(56,189,248,0.55)" },
  epic: { label: "Epic", color: "#a855f7", glow: "rgba(168,85,247,0.6)" },
  legendary: { label: "Legendary", color: "#ffb300", glow: "rgba(255,179,0,0.65)" },
  seasonal: { label: "Seasonal", color: "#ff5a9e", glow: "rgba(255,90,158,0.6)" },
};

export function rarityMeta(r: Rarity3D | undefined) {
  return RARITY_META[r ?? "common"] ?? RARITY_META.common;
}

/** Tab label + emoji for each customizer slot (display order = manifest.slots). */
export const SLOT_TAB_META: Record<Avatar3DSlot, { label: string; emoji: string }> = {
  base: { label: "Body", emoji: "🧍" },
  skinTone: { label: "Skin", emoji: "🎨" },
  hairStyle: { label: "Hair", emoji: "💇" },
  hairColor: { label: "Hair Color", emoji: "🌈" },
  eyeColor: { label: "Eyes", emoji: "👁️" },
  outfit: { label: "Color Theme", emoji: "🎨" },
  shoes: { label: "Shoes", emoji: "👟" },
  hat: { label: "Hat", emoji: "🧢" },
  glasses: { label: "Glasses", emoji: "👓" },
  backpack: { label: "Backpack", emoji: "🎒" },
  handheld: { label: "Handheld", emoji: "🪄" },
  pet: { label: "Pet", emoji: "🐾" },
  aura: { label: "Aura", emoji: "✨" },
  room: { label: "Room", emoji: "🏠" },
  animation: { label: "Emote", emoji: "🕺" },
};

/** Slots whose items are free to equip (no purchase needed). */
export const FREE_SLOTS: Avatar3DSlot[] = [
  "base",
  "skinTone",
  "eyeColor",
  "hairColor",
];

/** Slots hidden from the customizer + shop because they can't change a fixed
 * imported VRM at runtime: hair STYLE and shoes are baked-in mesh geometry.
 * (Body type DOES work now — picking Boy/Girl swaps to that base model; hair/
 * eye/skin COLOR recolor materials; outfits load a per-look model.) Extra hair
 * styles need extra models (bake them into a `{kid}-{outfit}.vrm` look). */
export const HIDDEN_SLOTS = new Set<Avatar3DSlot>(["hairStyle", "shoes"]);

/** Slots a learner can take OFF (back to nothing). Optional add-ons — unlike a
 * body/skin/eyes/hair/room/emote, which you always have exactly one of. The
 * customizer shows a "Take off" control for the equipped item in these slots. */
export const REMOVABLE_SLOTS = new Set<Avatar3DSlot>([
  "outfit",
  "hat",
  "glasses",
  "backpack",
  "handheld",
  "pet",
  "aura",
]);

/** A shop section: a heading + a predicate over catalog items. */
export type ShopSection = {
  id: string;
  label: string;
  emoji: string;
  match: (i: AvatarItem) => boolean;
};

export const SHOP_SECTIONS: ShopSection[] = [
  { id: "outfits", label: "Color Themes", emoji: "🎨", match: (i) => i.slot === "outfit" },
  { id: "pets", label: "Pets", emoji: "🐾", match: (i) => i.slot === "pet" },
  { id: "hats", label: "Hats", emoji: "🧢", match: (i) => i.slot === "hat" },
  { id: "glasses", label: "Glasses", emoji: "👓", match: (i) => i.slot === "glasses" },
  { id: "backpacks", label: "Backpacks", emoji: "🎒", match: (i) => i.slot === "backpack" },
  { id: "handhelds", label: "Handhelds", emoji: "🪄", match: (i) => i.slot === "handheld" },
  { id: "rooms", label: "Room Decor", emoji: "🏠", match: (i) => i.slot === "room" },
  { id: "effects", label: "Special Effects", emoji: "✨", match: (i) => i.slot === "aura" },
  { id: "emotes", label: "Emotes", emoji: "🕺", match: (i) => i.slot === "animation" },
  { id: "hair", label: "Hair Styles", emoji: "💇", match: (i) => i.slot === "hairStyle" && i.price > 0 },
  { id: "shoes", label: "Shoes", emoji: "👟", match: (i) => i.slot === "shoes" && i.price > 0 },
];

/** Quick-apply outfit presets. Apply equips only the pieces a learner owns. */
export type PresetTemplate = {
  id: string;
  name: string;
  emoji: string;
  loadout: Loadout3D;
};

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "school",
    name: "School Mode",
    emoji: "🎒",
    loadout: {
      outfit: "starter-hoodie",
      backpack: "school-bag",
      glasses: "round-glasses",
      handheld: "story-book",
    },
  },
  {
    id: "adventure",
    name: "Adventure Mode",
    emoji: "🧭",
    loadout: {
      outfit: "explorer-vest",
      hat: "explorer-hat",
      backpack: "adventure-pack",
      shoes: "boots",
      handheld: "telescope",
    },
  },
  {
    id: "cozy",
    name: "Cozy Mode",
    emoji: "🛋️",
    loadout: {
      outfit: "cozy-pajamas",
      hairStyle: "hair-wavy",
      pet: "kitten",
      room: "cozy-loft",
    },
  },
  {
    id: "space",
    name: "Space Mode",
    emoji: "🚀",
    loadout: {
      outfit: "space-suit",
      room: "space-bedroom",
      pet: "rocket-pet",
      aura: "star-aura",
    },
  },
  {
    id: "super-reader",
    name: "Super Reader",
    emoji: "📚",
    loadout: {
      outfit: "starter-hoodie",
      backpack: "book-hero-backpack",
      glasses: "round-glasses",
      handheld: "story-book",
      aura: "sparkle-aura",
    },
  },
  {
    id: "math-hero",
    name: "Math Hero",
    emoji: "🔢",
    loadout: {
      glasses: "math-wizard-glasses",
      outfit: "super-cape-suit",
      handheld: "magic-wand",
      aura: "sparkle-aura",
    },
  },
];
