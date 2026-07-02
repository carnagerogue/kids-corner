# Kids Corner — World 2.0 Design Brief

*Recommended gameplay direction for the clay-town overhaul. Produced by a 3-concept
design pass (each concept independently judged, then synthesized). Winning concept
scored 45/50.*

## 1. Recommended direction & why it won

**Reawaken the Clay Town: Mayor Nova's Season of Wonders** — grafted with **Town
Bloom's** family-shared "your approved chore literally blooms the town" spark, and
**Clay Corner's** no-fail personal-yard building as the always-available in-world beat.

The spine is *Reawaken the Clay Town*: over a summer season, the clay town starts grey
and "asleep," and each kid's real, parent-approved work is the spark that blooms a
landmark from grey clay into glowing color, with siblings racing to awaken the next
Wonder together. It won on the merits — top review score **45/50**, best-in-class on
**fitClayTown (10)** and **appCohesion (10)** — because it is the only concept where
*the approved chore itself is the payoff moment*, which is exactly the app's ethos.
Town Bloom (41) had the same soul but a heavier footprint and a real grind vector (a
Together Bonus minting tokens); Clay Corner (36) had the weakest work-coupling and an
honestly-XL scope (a full in-world level editor) mislabeled "L."

We take Reawaken's spine, then fix its two real weaknesses using the other two concepts:
- **Reawaken's motivation cliff** (nothing to do in-world before a landmark is awake —
  a dead session for Hailee, ~6, while she waits on a parent PIN) is solved by grafting
  in **Clay Corner's no-fail yard building** as the always-on beat, in its *starter*
  (Hailee-safe) form only.
- **Reawaken's "how do siblings feel it together" thinness** is solved with **Town
  Bloom's shared Bloom Meter** and **cosmetic-only Together shimmer** — never
  token-minting.

Crucially, we adopt the #1 reviewer's key improvement: **do NOT promote
`star-fountain`/`town-hall` into `LandmarkId`.** Verified against `academyQuests.ts:19`
(`AcademyQuestId = LandmarkId`) and `worldGame.ts:205` (`festivalCompleted` =
all-landmarks-active), that single decision turns a 4-file type ripple into **zero type
churn.**

## 2. Core gameplay loops

- **AWAKEN loop (the heart).** Walk up to a sleeping landmark (`clay-story-grove` /
  `clay-maker-yard` / `clay-sky-lab`), talk to its NPC (`clay-story-keeper` /
  `clay-maker-buddy` / `clay-sky-captain`). A chapter card shows an "Awaken" button
  **locked until you have N new parent-approved missions/assignments since the chapter
  started.** Do real work → parent approves in the PIN dashboard → return → the button
  lights → press it → the landmark blooms grey→color with `CelebrationBurst`, and a ring
  of clay scatter (`clay-flower-cluster`, `clay-tree`, `clay-lantern`) swaps in around it.
  Reuses the existing `active` emissive toggle already driving StoryGrove/MakerYard/SkyLab.
- **SHARD bank loop.** After awakening, a colored **Wonder Shard** (a per-chapter recolor
  of `clay-star`, floating via existing `FloatingStar`/`QuestCollectibles`) appears near
  the landmark. Carry it to Mayor Nova (`clay-mayor-nova`) at the plaza and hand it in to
  bank chapter progress toward the season finale.
- **ALWAYS-ON in-world beat (from Clay Corner, starter form).** At your home-yard tile,
  enter a **no-fail Build Mode**: snap-to-grid tap-to-place of earned clay props, fixed
  rotation steps, one scale, occupied-cell blocking. The thing to do *this session* while
  waiting on a parent approval — the fix for the dead-session cliff, especially for Hailee.
- **IN-WORLD-ONLY beat.** Once a landmark is awake, its NPC offers a 3-question
  `AcademyChallenge` or a short Lost-Stars-style hunt near it — cosmetic reward only.
- **TOWN BOARD + shared bloom.** A Town Board dialogue at the plaza shows which Wonders
  are awake, how many real approvals until the next chapter, and which sibling awakened
  which landmark (reads the existing `worldSync` shared-game map, which already carries
  `kidId`+`name`). A shared **Bloom Meter** ticks as the family banks shards.
- **TOGETHER shimmer (de-grinded).** When 2+ siblings are in the room, a shimmer ring
  appears at the plaza; standing in it pops a **synchronized emote + confetti only — zero
  tokens.**
- **RECURRING FINALE.** When all three Wonders are awake, `clay-festival-arch` rises over
  the plaza and every kid who helped earns a **season Wonder decoration** for their
  persistent yard (reuses the festival-completed path + HomeYard slot). A new season
  reseeds the town asleep — but with **one landmark already partly lit / a free intro
  star-hunt**, so no kid ever faces a wait-for-approval dead start.

## 3. Connection to the real-work photo-proof economy (ethos intact, no XP grinding)

- **The Awaken gate is the whole point.** The "Awaken" button reads
  `computeStats(state, kidId)` (`totalMissions` + `totalAssignments`) and enables *only*
  after new **parent-approved** submissions cross the chapter's `requiredNewApprovals`.
  Nothing self-marks; play cannot mint an awakening.
- **Grind-proof spark counting.** Because a kid may log in on iPad *and* laptop, the
  chapter baseline is **keyed on approved-submission IDs already counted**, not a
  timestamp watermark. `approvedSubmissions(state, kidId)` exposes per-submission ids/dates
  (`selectors.ts:149`) — store the set of ids counted at chapter start in the per-kid save.
- **Two wallets stay separate and honest.** In-world `WorldShop` spends
  `WorldSave.townTokens` (`worldGame.ts:116`); `coinBalance` lives in the app store
  (`selectors.ts:184`). World 2.0 introduces **no new spending of `coinBalance`** — we drop
  Clay Corner's Clay Cart. Build Mode places props the kid has **already earned**; it is
  not a coin sink.
- **In-world beats are cosmetic-only.** Academy challenges, star hunts, and the Together
  shimmer award only shards/tokens/emotes/confetti — **never the missionable XP** the
  parent report tracks.

## 4. Asset plan

**Reuses (already in `scripts/meshy/assets.mjs`):** the three Wonder landmarks
(`clay-story-grove`, `clay-maker-yard`, `clay-sky-lab`); `clay-star-fountain` +
`clay-town-hall` as plain scenery / Town Board anchor (NOT landmarks); NPCs
(`clay-mayor-nova`, `clay-story-keeper`, `clay-maker-buddy`, `clay-sky-captain`); rewards
(`clay-star`→Wonder Shards, `clay-town-token`, `clay-gift-box`, `clay-trophy`);
`clay-festival-arch`; and the nature/street scatter for blooms + yards.

**NEW `clay-*` models to ADD** (append to `assets.mjs`; all optional, each has a fallback):

| id | group | role | one-line prompt |
|---|---|---|---|
| `clay-wonder-shard` | rewards | prop | "a glowing faceted claymation crystal shard, softly luminous" *(fallback: recolor `clay-star`)* |
| `clay-fence-post` | street | prop | "a short chunky rounded clay fence post" *(fallback: procedural box fence)* |
| `clay-path-tile` | street | prop | "a flat rounded clay stepping-stone path tile" *(fallback: place props on grass)* |
| `clay-bloom-sprout` | nature | prop | "a tiny glowing clay sprout breaking through soil" *(fallback: `clay-mushroom`)* |

## 5. Implementation plan mapped to codebase seams

**Reality check:** the `worldRig / worldScenery / worldAvatars / WorldHud /
useWorldProgress` split **does not exist yet** — `WorldView.tsx` is a single 2,550-line
file. The split is *prerequisite refactor work*. **Phase 0 extracts it first**, so every
subsequent feature lands in a small file.

**`worldGame.ts` — state & reducers (localStorage per kid):**
- **Do NOT touch `LandmarkId`** (stays the three ids) → zero type churn across
  `festivalCompleted`, the typed `worldSync` map, and `AcademyQuestId`.
- Add a `SeasonArc` slice next to `activatedLandmarks`:
  `{ arcSeasonId; awakened: LandmarkId[]; chapterProgress: Record<LandmarkId, number>;
  approvedIdsAtChapterStart: string[] }`. Season id from `currentSeasonalEvent()`
  (`worldGame.ts:70`).
- Pure reducers `canAwaken` / `awakenLandmark` / `advanceChapter` mirroring
  `activateLandmarks`.
- Yard slice (bump `WorldSave` version, migrate from `selectedDecoration`):
  `yard: { props: PlacedProp[] }`, `PlacedProp = { id; cellX; cellZ; rotStep }`, **~40-prop
  cap**, `placeProp`/`removeProp` reducers.

**`WorldView.tsx` split (Phase 0):** `useWorldProgress.ts` (arc + yard reducers, approved-id
diff, `canAwaken` gate); `worldScenery.tsx` (grey/awake materials + TownHall/StarFountain +
`BloomRing`); `worldAvatars.tsx` (clay NPC swaps via `loadNpcAvatar`); `WorldHud.tsx`
(chapter card, Town Board, Build Mode HUD); `worldRig.tsx` (movement/camera/interact
dispatcher + new branches).

**`worldSync.ts`:** season-scope the hardcoded `game/lost-stars-v1` path (`worldSync.ts:175`)
to `game/season/{arcSeasonId}` (fixes reseed-bleed). Stays behind `worldRootPath()` /
`readSyncOverride()` — **no public room, COPPA posture unchanged.** Together shimmer reads
existing presence — no new node, cosmetic only.

**Persistence:** SeasonArc + yard = per-kid localStorage. Synced to the family room = only
awakened ids, banked shard counts, presence (all `kidId + name + numbers + timestamps`).
Yard layouts stay local-only in MVP.

**Phasing (honest effort):**
- **Phase 0 — S/M:** Extract the WorldView split. No behavior change; de-risks the 2,550-line file.
- **Phase 1 — M (the MVP):** SeasonArc slice, Awaken gate on real approvals, grey→color
  bloom + BloomRing, Wonder Shard turn-in, Town Board. Three landmarks, one chapter each.
- **Phase 2 — M:** Starter Build Mode, NPC model swaps, in-world academy/hunt beats,
  season-scoped sync + co-op Town Board line.
- **Phase 3 — L:** Recurring finale (arch + reseed with a pre-lit landmark), Together
  shimmer, multi-chapter content, yard sync/visiting.

## 6. Kid-safety + performance guardrails

**Safety (posture unchanged):** no new free-text surface anywhere — siblings interact only
via presence, fixed `QUICK_CHAT` phrases, and co-op progress; everything synced is
`kidId + name + numbers + timestamps`. Cheer/Together routes through a **fixed emote enum**,
never the `sendChat()` string field (`worldSync.ts:124`). All sync stays behind
`worldRootPath()` (null without a code). Nothing self-awards; a kid can only edit their own yard.

**Performance (iPad-class):** bloom scatter + yard props reuse the proven
`PropField`/`loadProp` normalize-and-clone-by-`[x,z,rotY,scale]` instancing (a yard is just
an `items[]` array), **hard ~40-prop cap**. Grey↔awake is an emissive/material swap on
already-loaded meshes — no new geometry at awaken. Static GLBs (NPCs stand idle). Respect
existing Low/Balanced/High tiers.

## 7. MVP vs. full vision

**Tight MVP (Phase 0 + Phase 1):** The town is grey and asleep. Three landmarks, one chapter
each. Walk up → NPC chapter card → "Awaken" locked until N new parent-approved tasks → do
real work, parent approves → return, press, watch it **bloom grey→color with a scatter ring
and celebration** → a Wonder Shard floats out → carry it to Mayor Nova → Town Board updates.
That single Awaken moment — *your approved chore literally lighting up the world* — is the
entire thesis, shippable on the existing engine with **zero type churn** and the WorldView
split as the only structural cost.

**Full vision (Phases 2–3):** no-fail Build Mode; clay NPC swaps; in-world academy/hunt
beats; season-scoped multiplayer with a live "who-awakened-what" Town Board and cosmetic
Together shimmer; multi-chapter arcs; and the recurring finale (arch rises, everyone earns a
season yard decoration, town reseeds with one landmark pre-lit).

**Honest effort:** realistic total is **L–XL**, driven by Phase 0 (splitting the 2,550-line
file) and Phase 3. **Phases 0–1 (the MVP) are a solid M** and the recommended first commitment.
