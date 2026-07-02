# Meshy asset pipeline — the clay World

Build-time tooling that generates the World's 3D models with
[Meshy](https://www.meshy.ai) text-to-3D, in a single cohesive **claymation**
style, and drops optimized GLBs into `public/assets/world/generated/` where the
game loads them.

**This is an authoring tool, run on your machine — never in the app.** The World
is a static site; anything in the client bundle is public, so the API key lives
only here and only at build time. Kids never trigger generation.

## Files

| File | What it is |
|---|---|
| `assets.mjs` | **The manifest.** Every model, its prompt, and its polygon budget. The shared `STYLE` string locks the clay look across all of them. Edit prompts here. |
| `generate.mjs` | Runs Meshy preview→refine→download for each asset. Dry-run by default; resumable. |
| `optimize.mjs` | Shrinks the raw GLBs for iPad-class devices (texture resize + mesh cleanup, no Draco/Meshopt so they still load). |
| `.env` | Your API key. **Gitignored.** Create it from `.env.example`. |
| `.raw/` | Untouched Meshy downloads. Gitignored (large). |
| `../../public/assets/world/generated/` | Optimized, committed, app-served GLBs. |

## Quick start

```bash
# 1. See exactly what will be generated + the credit estimate. Spends nothing.
node scripts/meshy/generate.mjs

# 2. Add your key (gitignored — stays off GitHub and out of the bundle).
cp scripts/meshy/.env.example scripts/meshy/.env
#    then edit scripts/meshy/.env and paste MESHY_API_KEY=...

# 3. Generate the whole town (~40 models). Resumable if interrupted.
node scripts/meshy/generate.mjs --run

# 4. Optimize for the web (one-time dep install, then run).
npm i -D @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions sharp
node scripts/meshy/optimize.mjs
```

Iterate on a single model without re-paying for the rest:

```bash
node scripts/meshy/generate.mjs --run --only clay-star-fountain
```

## How it works

Meshy is a two-step async pipeline:

1. **preview** — geometry only, honoring `target_polycount` (our web budget).
2. **refine** — bakes the clay textures (+ PBR roughness/normal) onto it.

`generate.mjs` submits both, polls each task to completion, downloads the GLB,
and records every task id + credit cost in `.state.json`. Because of that state
file, a crash, an out-of-credits stop (HTTP 402), or Ctrl-C never re-charges you
for finished work — just re-run with `--resume`.

## Cost

~20 credits per model (preview + textured refine, Meshy-6), so the full ~40-model
town is roughly **800 credits** — inside a single Pro month (1,000 credits), or a
small top-up. HD 4K textures are intentionally **off** (wasted on props this size
and they double the credit cost); flip `hdTexture: true` on a specific hero asset
in `assets.mjs` if you want it.

## Provenance

Generated models are yours (Meshy Pro+ grants private asset ownership). After a
run, `generated/ASSETS.json` lists every model, its prompt, and its credit cost —
add a summary row to `ASSET_SOURCES.md` (creator: "Meshy AI (generated)",
license: owned) to keep that file the single source of truth.
