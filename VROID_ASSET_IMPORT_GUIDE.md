# VRoid / VRM Asset Import Guide — Kids Corner

This guide explains how to add real 3D assets to the avatar system **safely** and
have them appear in the app automatically. You do **not** need to touch React code
to add an item — the system is **manifest-driven**.

> **TL;DR:** drop a file in the right folder → add one entry to
> `public/assets/avatar/avatar-manifest.json` → it shows up in the shop. If the
> file is missing or fails to load, the app falls back to the built-in procedural
> character, so nothing ever breaks.

---

## 1. Where files go

```
public/assets/avatar/
  models/        claire-base.vrm, coby-base.vrm, hailee-base.vrm   ← VRM characters (per learner)
  accessories/   *.glb / *.gltf  (hats/glasses/backpacks/handhelds/pets that attach to the VRM)
  outfits/       *.glb / *.gltf
  hats/          *.glb / *.gltf
  glasses/       *.glb / *.gltf
  backpacks/     *.glb / *.gltf
  handhelds/     *.glb / *.gltf
  pets/          *.glb / *.gltf
  auras/         *.glb / *.gltf  (or particle configs)
  rooms/         *.glb / *.gltf  (scene backdrops)
  hair/ eyes/ animations/        (optional extras)
  icons/         *.png            (shop card thumbnails, ~256×256, transparent)
  avatar-manifest.json            ← the catalog (edit this to add items)
```

### The character model (`models/`) — **this is what activates the 3D avatar**
- Name each file **`<kidId>-base.vrm`** — `claire-base.vrm`, `coby-base.vrm`,
  `hailee-base.vrm` (a child's id is shown in the grown-up area). The viewer loads
  the per-learner file first, then falls back to a body-type model
  (`girl-base-01.vrm` / `boy-base-01.vrm` / `neutral-base-01.vrm`) if present.
- **Until a model exists, the avatar stage shows a polished "Add VRoid model"
  placeholder — never a fake/procedural body.** The shop, coins, XP, and
  customization keep working the whole time.
- `.glb` / `.gltf` → accessories/props that **attach to the loaded VRM** (or stand
  beside it, for pets). Prefer **`.glb`**. A missing accessory file is simply
  skipped — it is never replaced with primitive geometry.
- `.png` → shop icons. Optional — without one, the card shows the item's emoji.

Files in `public/` are copied to the site root at build time. On GitHub Pages the
site is served from `/kids-corner/`, so an asset at
`public/assets/avatar/pets/kitten.glb` is reachable at
`/kids-corner/assets/avatar/pets/kitten.glb`. **In the manifest, always write the
path starting with `/assets/...`** — the app prepends the correct base URL for you
(`resolveAssetUrl()` in `src/features/avatar/AvatarManifest.ts`).

---

## 2. Add a new item to the manifest

Open `public/assets/avatar/avatar-manifest.json` and add one object to `items`:

```jsonc
{
  "id": "rocket-backpack",                 // unique, kebab-case
  "name": "Rocket Backpack",               // shown to learners
  "slot": "backpack",                      // must match a slot in "slots"
  "rarity": "rare",                        // common | uncommon | rare | epic | legendary | seasonal
  "price": 350,                            // coins; 0 = free (or mission/trophy unlock)
  "assetPath": "/assets/avatar/backpacks/rocket-backpack.glb",
  "iconPath": "/assets/avatar/icons/rocket-backpack.png",
  "unlockType": "shop",                    // starter | shop | mission | trophy | streak | seasonal
  "color": "#ff5a5a",                      // REQUIRED — accent + procedural tint fallback
  "emoji": "🎒",                            // REQUIRED — icon fallback if no PNG
  "description": "Blast-off ready storage."
}
```

`color` and `emoji` are **required** so the item is fully usable before you have a
real model/icon. They drive the shop card and the procedural 3D character's tint.

### Mission / trophy unlocks
Add an `unlockRequirement`. Supported shapes (checked in
`src/features/avatar/AvatarRewardEngine.ts`):

```jsonc
"unlockType": "mission",
"unlockRequirement": { "type": "completeMissionCategory", "category": "science", "count": 3 }
// other types:
// { "type": "streak", "days": 7 }
// { "type": "totalApproved", "count": 25 }
// { "type": "level", "level": 5 }
// { "type": "trophy", "badgeId": "<badge id from src/data/badges.ts>" }
```

Valid `category` values come from the app's real mission categories
(`src/types.ts` → `ActivityCategory`): `arts-crafts, drawing, building, outdoor,
science, writing, music, brain-games, family, kindness, chores, quiet`.

### Pricing guide (keep the economy balanced)
| Rarity | Price |
|--------|-------|
| Common | 25–75 |
| Uncommon | 100–200 |
| Rare | 250–500 |
| Epic | 750–1,250 |
| Legendary | 2,000+ |

> The bundled copy at `src/features/avatar/avatar-manifest.json` is the built-in
> catalog. The app loads that **and** fetches the `public/` copy at runtime,
> merging any new items by `id`. For built-in items, edit both (run
> `cp public/assets/avatar/avatar-manifest.json src/features/avatar/`). For items
> you add purely via the public file, editing just `public/` is enough.

---

## 3. Verify license safety (do this BEFORE adding the file)

1. Find the asset's license/terms page. If there isn't one, **stop** — don't use it.
2. Confirm it allows: **download**, **use in an app**, and **modification** (you'll
   likely resize/recolor).
3. Translate the terms if needed (many BOOTH terms are Japanese).
4. Reject anything mature, violent, weapon-like, scary, or a copyrighted
   character/look-alike.
5. **Log it** in `ASSET_SOURCES.md` (every column). If a column is uncertain, don't ship it.
6. If the license needs attribution, add a credit line (see CREDITS below).

Safest paths: **make it yourself in VRoid Studio**, or use **CC0** assets
(Quaternius, Kenney, Poly Pizza CC0).

---

## 4. Optimize models (so it stays fast on Chromebooks)

School devices are weak. Keep assets small:

- **Compress geometry + textures with Draco / KTX2.** Easiest tool:
  ```bash
  npx gltf-transform optimize input.glb output.glb
  # or, more aggressive:
  npx gltf-transform optimize input.glb output.glb --texture-compress webp --simplify
  ```
- Target budgets per item: **accessories < 20k triangles**, **textures ≤ 1024²**,
  **file size < 1–2 MB**. VRM base models < 60k triangles, < 8 MB.
- Prefer **one `.glb`** over `.gltf` + separate bin/textures (fewer requests).
- Make icons small PNGs (~256², transparent, < 50 KB).
- The app already **lazy-loads** the 3D engine (it only loads when a learner opens
  the avatar page) and loads a model **only when previewed/equipped**, never the
  whole catalog at once.

---

## 5. Test locally, then on GitHub Pages

**Local:**
```bash
npm run dev
# open the Avatar page → switch the stage to 3D → confirm your model loads,
# orbits, and the shop card shows your icon. Check the browser console for 404s.
```

**Production build (mirrors GitHub Pages base path):**
```bash
npm run build && npm run preview
# preview serves with the production base. Confirm assets resolve under the
# /kids-corner/ base and there are no 404s in the Network tab.
```

**Deploy:** push to `main`; the GitHub Action builds and publishes. After it
finishes, hard-refresh the live site and re-check the Network tab for your asset.

Common gotchas:
- **404 on GitHub Pages but fine locally** → you hard-coded a `/assets/...` URL in
  code instead of letting `resolveAssetUrl()` add the base. Use the manifest.
- **Model loads but is huge/tiny/sideways** → fix scale/rotation in the manifest
  via the optional `transform` fields, or re-export at the right scale.
- **Black model** → missing/!unsupported texture; re-run `gltf-transform`.

---

## 6. Adding future VRoid Hub / BOOTH assets safely (checklist)

- [ ] Opened the asset's **specific** license page (not just the site's).
- [ ] License explicitly allows **download**, **app use**, and **modification**.
- [ ] No attribution needed — or attribution added to CREDITS.
- [ ] Content is kid-safe (no weapons/mature/scary/character look-alikes).
- [ ] Optimized with `gltf-transform` (size + tris within budget).
- [ ] File placed in the correct `public/assets/avatar/<slot>/` folder.
- [ ] Manifest entry added (with `color` + `emoji` fallbacks).
- [ ] Row added to `ASSET_SOURCES.md` with all columns filled.
- [ ] Tested in `npm run preview` (production base) — no 404s.
- [ ] Kid **cannot** export the model (no export feature was added).

---

## CREDITS

If any shipped asset's license requires attribution, list it here and surface it
in the app's About/Credits area:

```
- "<Asset name>" by <Creator> — <source URL> — licensed under <license>.
```

_(empty — procedural assets only)_
