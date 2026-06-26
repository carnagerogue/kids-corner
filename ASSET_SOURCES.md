# Kids Corner — Avatar Asset Sources & Licenses

This file is the **single source of truth** for every avatar asset in the app:
where it came from, who made it, its license, and what you're allowed to do with
it. **Every binary asset you add (`.vrm`, `.glb`, `.gltf`, `.png`) MUST be logged
in the table below before it ships.**

---

## Current status: a few clearly-licensed third-party assets are bundled

Kids Corner bundles a small set of **clearly-licensed** third-party assets:
two sample anime characters, one idle animation, and six accessory props
(`.glb` hats / glasses / a backpack — all CC0 or CC-BY, see the log below).
Accessories are layered onto whatever VRM loads via the bone-attach pipeline in
`VRMAvatarViewer.tsx`; head items (hats/glasses) are anchored in world space to
the model's head box so they sit correctly on any rig. Everything else is
original or emoji.

1. **3D characters** — the app loads a **real VRoid `.vrm`** per learner from
   `public/assets/avatar/models/` (`src/features/avatar/VRMAvatarViewer.tsx`).
   Two license-clear anime samples ship by default: **pixiv's three-vrm demo
   model** (Claire) and **"Seed-san" by VirtualCast** (Coby & Hailee), so every
   stage shows a real anime character out of the box. Replace each with your own
   per-kid VRoid export anytime. A shared idle animation (`idle_loop.vrma`) is
   retargeted onto whatever model loads, so any rig stands naturally.
   (Other candidates were rejected: VRoid AvatarSample models aren't clearly
   redistributable; CC0 "Orion" wasn't anime.) **When no model is present the
   stage shows a polished "Add VRoid model" placeholder — it never renders a
   fake/procedural character.** (There is intentionally NO geometry-built avatar.)
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

| Asset file | Slot/Item id | Creator | Source URL | License | Commercial use? | Modify? | Redistribute? | Date checked | Added by |
|------------|--------------|---------|------------|---------|-----------------|---------|---------------|------------|----------|
| `models/claire-base.vrm` | base / default character (Claire) | pixiv Inc. © 2022 | https://github.com/pixiv/three-vrm — `packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm` | [VRM 1.0 License](https://vrm.dev/licenses/1.0/) — verified from the model's embedded `VRMC_vrm.meta` | **Yes** (`commercialUsage: corporation`) | **Yes** (`modification: allowModificationRedistribution`) | **Yes** (`allowRedistribution: true`; `creditNotation: unnecessary`, `avatarPermission: everyone`) | 2026-06-26 | Claude (automated) |
| `models/coby-base.vrm`, `hailee-base.vrm` (same file) | base / default character (Coby, Hailee) | VirtualCast, Inc. ("Seed-san") | https://github.com/vrm-c/vrm-specification — `samples/Seed-san/vrm/Seed-san.vrm` | [VRM 1.0 License](https://vrm.dev/licenses/1.0/) — verified from embedded `VRMC_vrm.meta` | **Yes** (`commercialUsage: corporation`) | **Yes** (`modification: allowModificationRedistribution`) | **Yes** (`allowRedistribution: true`; `avatarPermission: everyone`) — ⚠️ **credit required** (`creditNotation: required`; credited in-app + here) | 2026-06-26 | Claude (automated) |
| `animations/idle_loop.vrma` | idle animation (all learners) | moeru-ai / airi contributors | https://github.com/moeru-ai/airi — `packages/stage-ui-three/src/assets/vrm/animations/idle_loop.vrma` | **MIT** (repo license; redistribution + modification permitted with notice) | Yes | Yes | Yes (notice preserved; credited in-app + here) | 2026-06-26 | Claude (automated) |
| `hats/crown.glb` | hat / `crown` (Royal Crown) | Quaternius | https://poly.pizza/m/i0PZVuVlYv | **CC0 1.0** (public domain) | Yes | Yes | Yes (no attribution required) | 2026-06-26 | Claude (automated) |
| `hats/ball-cap.glb` | hat / `ball-cap` (Ball Cap) | Jarlan Perez | https://poly.pizza/m/2uKEHjO_QL0 | **CC-BY 3.0** | Yes | Yes | Yes — ⚠️ **credit required** (credited in-app + here) | 2026-06-26 | Claude (automated) |
| `hats/cat-ears.glb` | hat / `cat-ears` (Cat Ears) | Poly by Google | https://poly.pizza/m/197Gkpt6GNV | **CC-BY 3.0** | Yes | Yes | Yes — ⚠️ **credit required** (credited in-app + here) | 2026-06-26 | Claude (automated) |
| `glasses/round-glasses.glb` | glasses / `round-glasses` (Round Glasses) — Aviator model | Poly by Google | https://poly.pizza/m/0Wsi-ygmiIX | **CC-BY 3.0** | Yes | Yes | Yes — ⚠️ **credit required** (credited in-app + here) | 2026-06-26 | Claude (automated) |
| `glasses/cool-shades.glb` | glasses / `cool-shades` (Cool Shades) | iPoly3D (Glasses Pack) | https://poly.pizza/bundle/Glasses-Pack-gPz05eJm9w | **CC0 1.0** (public domain) | Yes | Yes | Yes (no attribution required) | 2026-06-26 | Claude (automated) |
| `backpacks/school-bag.glb` | backpack / `school-bag` (School Bag) | Quaternius | https://poly.pizza (Quaternius pack) | **CC0 1.0** (public domain) | Yes | Yes | Yes (no attribution required) | 2026-06-26 | Claude (automated) |

> **Note on `claire-base.vrm`:** it is pixiv's official, widely-used three-vrm
> sample — a normal, fully-clothed anime character, appropriate as a kid avatar.
> Its embedded meta sets liberal *permission* flags (e.g. `allowExcessivelySexualUsage`)
> — those describe what uses the author **permits**, not the model's content. We
> use it only as a wholesome avatar. Swap in your own VRoid models anytime.

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
