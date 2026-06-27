# 👉 Add your VRoid `.vrm` models here

This folder is where the **real 3D characters** live. Any learner without a
`.vrm` here shows a **polished "Add VRoid model" placeholder** — it will
**never** render a fake primitive character.

> **Samples ship already:** two clearly-licensed anime models are bundled —
> `claire-base.vrm` (pixiv's three-vrm sample) and `coby-base.vrm` /
> `hailee-base.vrm` ("Seed-san" by VirtualCast) — so every learner shows a real
> 3D anime character out of the box (see `../../../ASSET_SOURCES.md`). A shared
> idle animation (`../animations/idle_loop.vrma`) is retargeted onto whatever
> model loads, so **any** rig stands naturally — no per-model pose tuning needed.
> Drop in your own VRoid export per kid (same filenames) for distinct characters.
> Each model is ~10 MB — optimize or swap for lighter ones when you can.

## Per-learner models (recommended)

Name each file `<kidId>-base.vrm`. The default learners use these ids:

- `claire-base.vrm`
- `coby-base.vrm`
- `hailee-base.vrm`

(For children you add later, the id is shown in the grown-up area; use
`<that-id>-base.vrm`. If a learner has no per-kid file, the app falls back to a
body-type model if present — `girl-base-01.vrm`, `boy-base-01.vrm`,
`neutral-base-01.vrm` — otherwise the placeholder.)

## Per-outfit "look" models (swappable outfits / hair / body)

Outfits, body type, hair **style** and shoes are *baked into the mesh* of a VRM
— a single model has exactly one of each, so they can't be swapped at runtime
like a hat. To make an outfit actually change the character, add a **separate
full model per look**, named `<kidId>-<outfit>.vrm`. When a learner equips that
outfit, the app loads the matching model (and re-attaches their hat/glasses/pet
on top). **If the file doesn't exist, equipping the outfit just keeps the base
model — nothing breaks.** So you only make the looks you want.

Outfit → filename (drop these in this folder):

| Shop outfit | File (per kid) |
|-------------|----------------|
| Starter Hoodie | `<kidId>-hoodie.vrm` |
| Explorer Vest | `<kidId>-vest.vrm` |
| Soccer Kit | `<kidId>-soccer.vrm` |
| Artist Smock | `<kidId>-smock.vrm` |
| Cozy Pajamas | `<kidId>-pajamas.vrm` |
| Space Suit | `<kidId>-space.vrm` |
| Super Hero Suit | `<kidId>-hero.vrm` |
| Galaxy Guardian | `<kidId>-galaxy.vrm` |
| Summer Champion Outfit | `<kidId>-champion.vrm` |

e.g. `claire-soccer.vrm` = Claire's character wearing the soccer kit. Each look
model bakes in whatever hair/body/shoes you want for that look (those slots
can't move independently of the model). Workflow:

1. In **VRoid Studio**, open/make the kid's character.
2. Dress them in the outfit (and adjust hair/body if you like).
3. **Export → VRM**, name it `<kidId>-<outfit>.vrm` from the table above.
4. Drop it here. Equip that outfit in-app → the new look loads automatically.

> Heads-up: each model is ~10 MB, so a model per outfit per kid adds up fast.
> Make only the looks you care about — the rest fall back to the base model.

## How to get a model (free + license-safe)

1. Install **VRoid Studio** (free): https://vroid.com/en/studio
2. Make a character (or open a built-in **sample model**).
3. **Export → VRM**. Models you create are yours — no third-party license.
4. Drop the `.vrm` here and rename it to e.g. `claire-base.vrm`.
5. Reload the avatar page — the 3D character appears automatically.

Full walkthrough, optimization tips, and license rules:
`../../../VROID_ASSET_IMPORT_GUIDE.md` · log every asset in
`../../../ASSET_SOURCES.md`.

## Keep it fast (Chromebooks)

Optimize before shipping so it stays smooth:

```bash
npx gltf-transform optimize claire-base.vrm claire-base.vrm
```

Aim for **< ~8 MB** and **< ~60k triangles** per model.

## If a model fails to load

The app catches load errors and falls back to the placeholder (it won't crash
or show a broken/half-loaded body). Check the browser console for the failing
URL, confirm the filename matches the learner id exactly, and that the file is a
valid VRM (re-export from VRoid Studio if unsure).

> ⚠️ Don't import copyrighted anime/game characters into VRoid and export them —
> that does **not** make them license-clean. Make originals or use clearly-licensed
> free models.
