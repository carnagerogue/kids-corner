// ---------------------------------------------------------------------------
// Kids Corner — Meshy asset manifest (the whole clay-town in one place).
//
// This is the single source of truth for every AI-generated World model. The
// generator (generate.mjs) reads STYLE + ASSETS and drives Meshy's two-step
// text-to-3D (preview -> refine). Editing a prompt here and re-running --only
// <id> regenerates just that model, so this file is meant to be iterated on.
//
// STYLE is appended to every prompt so the whole town shares one look. Do NOT
// bake per-object color/lighting words that fight it — describe the *object*
// and let STYLE carry the claymation aesthetic. Meshy-6 ignores the legacy
// `art_style` param, so the style must live in the prompt text.
// ---------------------------------------------------------------------------

/** Shared claymation look, appended to every prompt. Keep it tight — long
 *  prompts dilute the subject. */
export const STYLE =
  "handmade modeling clay, claymation stop-motion style, soft matte plasticine " +
  "surface with faint fingerprint texture, rounded chunky simple shapes, bright " +
  "cheerful storybook palette with varied colors, soft even studio lighting, one " +
  "object floating on its own, no base, no stand, no ground plate, no podium, " +
  "plain neutral background, no text, no words, wholesome and child-friendly";

/** Default generation knobs; each asset can override. */
export const DEFAULTS = {
  ai_model: "meshy-6",      // latest quality tier
  topology: "triangle",     // fine for three.js GLTFLoader on the web
  should_remesh: true,      // honor target_polycount (web/iPad budget)
  target_polycount: 10000,
  enable_pbr: true,         // clay wants matte roughness + subtle normal
  hd_texture: false,        // 4K is wasted on tablet-sized props; saves credits
  moderation: true,         // content screening on (kids' app)
  target_formats: ["glb"],
};

/**
 * Every model in the overhauled World.
 *   id     kebab id; also the output filename (public/assets/world/generated/<id>.glb)
 *   group  logical bucket (docs/reporting only)
 *   role   how the World uses it (drives wiring + procedural idle for npc/hero)
 *   poly   target_polycount override (web budget: props small, buildings/heroes larger)
 *   pbr    override enable_pbr (kept on for clay; off for tiny emissive collectibles)
 *   prompt subject only — STYLE is appended by the generator
 */
export const ASSETS = [
  // ---- Nature (scatter props) ------------------------------------------
  { id: "clay-tree",          group: "nature",  role: "prop",  poly: 9000,  prompt: "a cute round-canopy shade tree with a stubby trunk" },
  { id: "clay-pine",          group: "nature",  role: "prop",  poly: 8000,  prompt: "a small friendly pine fir tree" },
  { id: "clay-bush",          group: "nature",  role: "prop",  poly: 6000,  prompt: "a rounded leafy garden bush" },
  { id: "clay-flower-cluster",group: "nature",  role: "prop",  poly: 6000,  prompt: "a small cluster of chunky cheerful garden flowers" },
  { id: "clay-rock",          group: "nature",  role: "prop",  poly: 4000,  prompt: "a plain grey stone boulder, a smooth solid rock, no spots, not a mushroom" },
  { id: "clay-mushroom",      group: "nature",  role: "prop",  poly: 5000,  prompt: "a big friendly spotted toadstool mushroom" },
  { id: "clay-log",           group: "nature",  role: "prop",  poly: 6000,  prompt: "a short mossy fallen log" },
  { id: "clay-grass-tuft",    group: "nature",  role: "prop",  poly: 3500,  prompt: "a small tuft of grass blades" },

  // ---- Street & camp props ---------------------------------------------
  { id: "clay-bench",         group: "street",  role: "prop",  poly: 6000,  prompt: "a simple wooden park bench" },
  { id: "clay-streetlamp",    group: "street",  role: "prop",  poly: 6000,  prompt: "an old-fashioned street lamp post with a lantern" },
  { id: "clay-signpost",      group: "street",  role: "prop",  poly: 5000,  prompt: "a wooden directional signpost with blank arrow boards" },
  { id: "clay-well",          group: "street",  role: "prop",  poly: 9000,  prompt: "a round stone wishing well with a little peaked roof and bucket" },
  { id: "clay-windmill",      group: "street",  role: "prop",  poly: 11000, prompt: "a windmill building tower with four large flat sail blades on the front and a small door at the base, an actual windmill structure not a balloon" },
  { id: "clay-campfire",      group: "street",  role: "prop",  poly: 5000,  prompt: "a stacked-log campfire with small warm flames" },
  { id: "clay-market-stall",  group: "street",  role: "prop",  poly: 9000,  prompt: "a striped-awning market stall with a little counter" },
  { id: "clay-tent",          group: "street",  role: "prop",  poly: 6000,  prompt: "a cozy triangular camping tent" },
  { id: "clay-mailbox",       group: "street",  role: "prop",  poly: 4000,  prompt: "a rounded mailbox on a wooden post" },
  { id: "clay-planter",       group: "street",  role: "prop",  poly: 4500,  prompt: "a wooden flower planter box full of blooms" },
  { id: "clay-lantern",       group: "street",  role: "prop",  poly: 4000,  prompt: "a hanging round paper festival lantern" },

  // ---- Buildings (town shells) -----------------------------------------
  { id: "clay-cottage",       group: "building",role: "building",poly:16000, prompt: "a cozy small cottage house with a peaked roof, round door and windows" },
  { id: "clay-shop",          group: "building",role: "building",poly:16000, prompt: "a little corner shop storefront with a striped awning and big window" },
  { id: "clay-library",       group: "building",role: "building",poly:17000, prompt: "a small storybook library building with an arched doorway" },
  { id: "clay-workshop",      group: "building",role: "building",poly:16000, prompt: "a maker workshop tinker shed with a slanted roof and round window" },
  { id: "clay-observatory",   group: "building",role: "building",poly:18000, prompt: "a small domed observatory building with a telescope slit" },
  { id: "clay-town-hall",     group: "building",role: "building",poly:20000, prompt: "a friendly small-town hall with a little clock tower and steps" },

  // ---- Hero landmarks (quest anchors; larger budget) -------------------
  { id: "clay-star-fountain", group: "hero",    role: "hero",  poly: 18000, prompt: "a magical tiered stone fountain with a big glowing five-point star floating on top" },
  { id: "clay-story-grove",   group: "hero",    role: "hero",  poly: 20000, prompt: "a giant friendly tree with a cozy reading-nook treehouse and a little ladder" },
  { id: "clay-maker-yard",    group: "hero",    role: "hero",  poly: 18000, prompt: "a colorful outdoor workbench yard with big gears, tools and a pegboard" },
  { id: "clay-sky-lab",       group: "hero",    role: "hero",  poly: 20000, prompt: "a small domed observatory building with a large telescope poking out of the round dome roof, a building structure, not a character, not an animal" },
  { id: "clay-festival-arch", group: "hero",    role: "hero",  poly: 15000, prompt: "a festive celebration archway with banners, bunting and lanterns" },

  // ---- NPC characters (static mesh; World applies a gentle procedural idle) ----
  { id: "clay-mayor-nova",    group: "npc",     role: "npc",   poly: 14000, prompt: "a friendly round cartoon town mayor character wearing a sash, standing upright, arms at sides, full body" },
  { id: "clay-story-keeper",  group: "npc",     role: "npc",   poly: 14000, prompt: "a gentle cartoon librarian storyteller character holding a book, standing upright, full body" },
  { id: "clay-sky-captain",   group: "npc",     role: "npc",   poly: 14000, prompt: "a cheerful cartoon kid astronaut pilot character in a suit, standing upright, full body" },
  { id: "clay-maker-buddy",   group: "npc",     role: "npc",   poly: 14000, prompt: "a playful cartoon kid inventor character with goggles on the forehead, standing upright, full body" },

  // ---- Collectibles & rewards (small; some emissive) -------------------
  { id: "clay-star",          group: "reward",  role: "prop",  poly: 3000,  pbr: false, prompt: "a single glowing golden five-point collectible star" },
  { id: "clay-town-token",    group: "reward",  role: "prop",  poly: 2500,  pbr: false, prompt: "a plain round flat gold coin with one simple raised star in the center, a smooth metal coin, not a badge, not a logo, no ribbon" },
  { id: "clay-gift-box",      group: "reward",  role: "prop",  poly: 3500,  prompt: "a small wrapped gift box with a bow" },
  { id: "clay-trophy",        group: "reward",  role: "prop",  poly: 4000,  prompt: "a small friendly golden trophy cup" },

  // ---- World 2.0 (Season of Wonders) additions -------------------------
  { id: "clay-wonder-shard",  group: "reward",  role: "prop",  poly: 3000,  pbr: false, prompt: "a sharp angular faceted crystal gem shard standing upright, a glowing translucent magic gemstone with flat cut facets, no face, not a character, not round" },
  { id: "clay-fence-post",    group: "street",  role: "prop",  poly: 3000,  prompt: "a short chunky rounded fence post" },
  { id: "clay-path-tile",     group: "street",  role: "prop",  poly: 2500,  prompt: "a flat rounded stepping-stone path tile" },
  { id: "clay-bloom-sprout",  group: "nature",  role: "prop",  poly: 3000,  prompt: "a tiny sprout just breaking through soil" },
];

/** Build the final prompt sent to Meshy for an asset. */
export function fullPrompt(asset) {
  return `${asset.prompt.trim().replace(/\.$/, "")}. ${STYLE}.`;
}

/** Merge DEFAULTS + per-asset overrides into a preview-task body. */
export function previewBody(asset) {
  return {
    mode: "preview",
    prompt: fullPrompt(asset),
    ai_model: asset.ai_model ?? DEFAULTS.ai_model,
    topology: asset.topology ?? DEFAULTS.topology,
    should_remesh: asset.should_remesh ?? DEFAULTS.should_remesh,
    target_polycount: asset.poly ?? DEFAULTS.target_polycount,
    moderation: asset.moderation ?? DEFAULTS.moderation,
    target_formats: asset.target_formats ?? DEFAULTS.target_formats,
  };
}

/** Refine-task body (adds textures to a finished preview). */
export function refineBody(asset, previewTaskId) {
  return {
    mode: "refine",
    preview_task_id: previewTaskId,
    enable_pbr: asset.pbr ?? DEFAULTS.enable_pbr,
    hd_texture: asset.hdTexture ?? DEFAULTS.hd_texture,
    ai_model: asset.ai_model ?? DEFAULTS.ai_model,
    target_formats: asset.target_formats ?? DEFAULTS.target_formats,
    // A light texture nudge reinforces the shared clay look on the skin pass.
    texture_prompt: STYLE,
  };
}
