# World 3D asset credits

All third-party 3D assets in this folder are **CC0 1.0 (public domain)** — free
for commercial use, no attribution required. Credits below are courtesy.

## Kit props (CC0 — Kenney, https://kenney.nl/assets)
The loose `.glb` props and kits come from Kenney's CC0 game asset packs
(City Kit, City Kit (Roads), Nature Kit, Mini Characters):

- `road-kit.glb` — Kenney **City Kit (Roads)** (road tiles, `light_square` lamps)
- `bench.glb`, `streetlight.glb`, `signpost.glb`, `shop.glb`, `stall.glb`,
  `tent.glb`, `well.glb`, `windmill.glb`, `house.glb`, `house-modern.glb`,
  `campfire.glb`, `log.glb` — Kenney **City / Survival / Holiday** kits
- `tree.glb`, `pine.glb`, `palm.glb`, `bush.glb`, `flowerbush.glb`, `flowers.glb`,
  `grass.glb`, `mushroom.glb`, `rock.glb`, `rock-large.glb` — Kenney **Nature Kit**
- `city-modular/` — Kenney **City Kit** (door/window detail) — see its `LICENSE.txt`
- `npcs/kenney-mini/` — Kenney **Mini Characters** — see its `LICENSE.txt`
- `map-happy-town.glb` — pre-built town map (currently unused; suburb/town is
  assembled procedurally)

## Procedural / original geometry (no external assets)
These are authored in code (Three.js), not imported, so they carry no third-party
license:

- The paved **town ground** — plaza, avenues, sidewalks, crosswalks, park paths
  (`src/world/TownGround.tsx`)
- The **background skyline** ring of buildings (`src/world/Skyline.tsx`)
- The enterable **shop buildings**, varied roofs, awnings, signs, and all
  landmark sculptures (`src/world/CityBuildings.tsx`, `src/world/WorldContent.tsx`)
