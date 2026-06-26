// ---------------------------------------------------------------------------
// Avatar feature — shared types for the manifest-driven 3D cosmetic system.
// The persisted state types (Loadout3D, Avatar3DSlot, …) live in src/types.ts;
// these describe the *catalog* (manifest) and reward rules.
// ---------------------------------------------------------------------------
import type { Avatar3DSlot, Rarity3D } from "../../types";

export type {
  Avatar3DSlot,
  Loadout3D,
  Rarity3D,
  SavedLoadout3D,
} from "../../types";

/** How an item becomes available. */
export type UnlockType =
  | "starter"
  | "shop"
  | "mission"
  | "trophy"
  | "streak"
  | "seasonal";

/** A condition that auto-unlocks an item from learning progress. */
export type UnlockRequirement =
  | { type: "completeMissionCategory"; category: string; count: number }
  | { type: "streak"; days: number }
  | { type: "totalApproved"; count: number }
  | { type: "level"; level: number }
  | { type: "trophy"; badgeId: string };

/** One catalog item from avatar-manifest.json. */
export type AvatarItem = {
  id: string;
  name: string;
  slot: Avatar3DSlot;
  rarity: Rarity3D;
  /** Coins to buy. 0 = free (or unlocked via mission/trophy). */
  price: number;
  unlockType: UnlockType;
  unlockRequirement?: UnlockRequirement;
  /** Hidden in the shop until the kid reaches this level. */
  levelReq?: number;
  /** CSS color: tints the procedural 3D character + frames the shop card. */
  color: string;
  /** Emoji used as the icon when no real PNG exists at iconPath. */
  emoji: string;
  /** Slot value the renderer switches on (a style key, or a CSS color). */
  value?: string;
  /** Only on `base` items: which body the procedural placeholder builds. */
  bodyType?: "girl" | "boy" | "neutral";
  /** Where a real .vrm/.glb will live (may 404 → procedural fallback). */
  assetPath?: string;
  /** Where a real icon PNG will live (may 404 → emoji fallback). */
  iconPath?: string;
  description?: string;
};

/** A slot definition (drives customizer tabs). */
export type SlotDef = { key: Avatar3DSlot; label: string; free: boolean };

/** The whole catalog. */
export type AvatarManifest = {
  version: number;
  slots: SlotDef[];
  items: AvatarItem[];
};

/** Why an item is currently locked (for the card's lock label). */
export type LockReason =
  | { kind: "none" }
  | { kind: "coins"; need: number }
  | { kind: "level"; level: number }
  | { kind: "mission"; text: string }
  | { kind: "locked" };
