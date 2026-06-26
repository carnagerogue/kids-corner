# Kids Corner — Avatar Asset Sources & Licenses

This file is the **single source of truth** for every avatar asset in the app:
where it came from, who made it, its license, and what you're allowed to do with
it. **Every binary asset you add (`.vrm`, `.glb`, `.gltf`, `.png`) MUST be logged
in the table below before it ships.**

---

## Current status: NO third-party binary assets are bundled

As shipped, Kids Corner contains **zero** downloaded/third-party model, texture,
or image files, and requires **no license**:

1. **3D character** — the app loads a **real VRoid `.vrm`** from
   `public/assets/avatar/models/` (`src/features/avatar/VRMAvatarViewer.tsx`).
   None are bundled. **When no model is present the avatar stage shows a polished
   "Add VRoid model" placeholder card — it never renders a fake/procedural
   character.** (There is intentionally NO geometry-built avatar.)
2. **Shop icons** — each catalog item ships a built-in **emoji + color** so cards
   render with no image files; `iconPath` PNGs are optional upgrades.

The `assetPath` / `iconPath` fields in `avatar-manifest.json` point at the
**folders where real assets will go** (`.vrm` characters in `models/`, `.glb`
accessories in `accessories/` & the per-slot folders). The app auto-upgrades the
moment you drop in properly-licensed assets; missing ones degrade gracefully (the
placeholder for a model, the emoji for an icon) — never to fake geometry.

> Because of this, the license table below starts **empty**. You fill it in as
> you add assets. See `VROID_ASSET_IMPORT_GUIDE.md` for the step-by-step.

---

## Asset license log

| Asset file | Slot/Item id | Creator | Source URL | License | Commercial use? | Modify? | Redistribute? | Date added | Added by |
|------------|--------------|---------|------------|---------|-----------------|---------|---------------|------------|----------|
| _(none yet — no models bundled; placeholder shown)_ | | | | | | | | | |

**Every new row must answer all columns.** If you can't fill in the License,
Commercial, Modify, and Redistribute columns with certainty, **do not add the
asset.**

---

## Approved free sources (vet EACH asset individually)

A source being "free" does **not** mean every asset on it is usable. Licenses are
**per-asset** and set by each creator. Always open the specific asset's license
before downloading.

### 1. VRoid Studio (recommended — safest)
- **URL:** https://vroid.com/en/studio
- **What:** A free desktop app to *create your own* anime-style VRM characters.
- **License:** Models **you** create are **yours**. This is the safest route —
  no third-party rights involved. Great for making an avatar per learner.
- **Use here:** Export `.vrm` → place in `public/assets/avatar/models/`.
- ⚠️ Do **not** import other people's copyrighted characters (anime/game) into
  VRoid and export them. That does not make them license-clean.

### 2. VRoid Hub
- **URL:** https://hub.vroid.com
- **What:** A gallery of community VRM models. Some allow download + use.
- **License:** **Per-model.** Each model lists permitted uses (download,
  modification, commercial, redistribution, avatar use, etc.). Only use models
  that **explicitly allow** download and your intended use. Record the exact
  permissions in the table above.

### 3. BOOTH
- **URL:** https://booth.pm
- **What:** A marketplace; many creators offer **free** VRM models, outfits,
  hair, and `.glb` props.
- **License:** **Per-item**, set by the creator (often a Japanese-language terms
  file — read it / translate it). Only use items whose terms clearly allow web-app
  use. Keep a copy of the terms file alongside the asset.

### 4. General free 3D props (`.glb`/`.gltf` for hats, pets, props, rooms)
Only sources with **clear, explicit** licenses:
- **Khronos glTF Sample Assets** — https://github.com/KhronosGroup/glTF-Sample-Assets (per-model license; many CC0/CC-BY).
- **Poly Pizza** — https://poly.pizza (CC-BY / CC0; attribution required for CC-BY — log it).
- **Quaternius** — https://quaternius.com (CC0 — public domain, very safe).
- **Kenney** — https://kenney.nl (CC0 — public domain, very safe).

---

## Hard rules (kid-safe + license-safe)

These are enforced by review, not code. Reject any asset that fails:

- ❌ No paid, ripped, or pirated assets.
- ❌ No copyrighted anime/game/movie characters or look-alikes.
- ❌ No assets with unclear, missing, or untranslated license terms.
- ❌ No mature/violent/scary content — no weapons, gore, alcohol, etc.
- ❌ No assets that require the **end user** to agree to extra terms.
- ✅ Prefer **CC0 / public domain**, then your own VRoid Studio creations.
- ✅ If a license requires **attribution**, add a visible credit (see
  `CREDITS` section of `VROID_ASSET_IMPORT_GUIDE.md`).
- ✅ Learners can customize avatars **in-app only** — the app must **not** let
  kids export/download the resulting VRM model. (Enforced: there is no export.)

---

## Why kids can't export models

Per project requirement, the app provides **no avatar/model export or download**
for learners. Customization is a live, in-app experience. This keeps us clear of
any "redistribution" license question entirely — we never hand a model file to an
end user. Do not add an export feature without re-reviewing every asset's
redistribution terms.
