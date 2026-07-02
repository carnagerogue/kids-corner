// ---------------------------------------------------------------------------
// generatedAssets — one place mapping the World's logical needs to the
// AI-generated clay GLBs in public/assets/world/generated/.
//
// The visual overhaul swaps the old CC0 Kenney/Quaternius props for these
// cohesive claymation models. Keeping the id->path mapping here (rather than
// scattering string literals across WorldView/WorldContent) means a future
// re-roll or rename is a one-line change.
//
// These are RAW public paths (leading slash). Every World loader wraps its url
// in resolveAssetUrl() at load time (so it works under the /kids-corner/ base),
// so DON'T pre-resolve here or the base would be applied twice.
// ---------------------------------------------------------------------------
import type { LandmarkId } from "./worldGame";

/** Raw public path to an optimized generated clay model (resolve at load). */
export function clayPath(id: string): string {
  return `/assets/world/generated/${id}.glb`;
}

/** The three awakenable Wonder landmarks, keyed by LandmarkId. */
export const CLAY_LANDMARKS: Record<LandmarkId, string> = {
  "story-grove": clayPath("clay-story-grove"),
  "maker-yard": clayPath("clay-maker-yard"),
  "sky-lab": clayPath("clay-sky-lab"),
};

/** Non-landmark hero scenery + the plaza anchors. */
export const CLAY_SCENERY = {
  starFountain: clayPath("clay-star-fountain"),
  townHall: clayPath("clay-town-hall"),
  festivalArch: clayPath("clay-festival-arch"),
} as const;

/** NPCs, keyed by the World's roles (swapped in for the Kenney mini-characters). */
export const CLAY_NPCS = {
  mayor: clayPath("clay-mayor-nova"),
  storyKeeper: clayPath("clay-story-keeper"),
  skyCaptain: clayPath("clay-sky-captain"),
  makerBuddy: clayPath("clay-maker-buddy"),
} as const;

/** Building shells for the town ring. */
export const CLAY_BUILDINGS = {
  cottage: clayPath("clay-cottage"),
  shop: clayPath("clay-shop"),
  library: clayPath("clay-library"),
  workshop: clayPath("clay-workshop"),
  observatory: clayPath("clay-observatory"),
  townHall: clayPath("clay-town-hall"),
} as const;

/** Scatter + yard-buildable props. */
export const CLAY_PROPS = {
  tree: clayPath("clay-tree"),
  pine: clayPath("clay-pine"),
  bush: clayPath("clay-bush"),
  flowerCluster: clayPath("clay-flower-cluster"),
  rock: clayPath("clay-rock"),
  mushroom: clayPath("clay-mushroom"),
  log: clayPath("clay-log"),
  grassTuft: clayPath("clay-grass-tuft"),
  bench: clayPath("clay-bench"),
  streetlamp: clayPath("clay-streetlamp"),
  signpost: clayPath("clay-signpost"),
  well: clayPath("clay-well"),
  windmill: clayPath("clay-windmill"),
  campfire: clayPath("clay-campfire"),
  marketStall: clayPath("clay-market-stall"),
  tent: clayPath("clay-tent"),
  mailbox: clayPath("clay-mailbox"),
  planter: clayPath("clay-planter"),
  lantern: clayPath("clay-lantern"),
  fencePost: clayPath("clay-fence-post"),
  pathTile: clayPath("clay-path-tile"),
  bloomSprout: clayPath("clay-bloom-sprout"),
} as const;

/** Collectibles + rewards. */
export const CLAY_REWARDS = {
  star: clayPath("clay-star"),
  // Meshy kept giving a dedicated shard a cartoon face; per the design brief's
  // fallback we reuse the (clean) star and tint it per chapter instead.
  wonderShard: clayPath("clay-star"),
  townToken: clayPath("clay-town-token"),
  giftBox: clayPath("clay-gift-box"),
  trophy: clayPath("clay-trophy"),
} as const;
