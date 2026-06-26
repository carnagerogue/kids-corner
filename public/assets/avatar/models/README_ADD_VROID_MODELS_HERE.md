# 👉 Add your VRoid `.vrm` models here

This folder is where the **real 3D characters** live. Any learner without a
`.vrm` here shows a **polished "Add VRoid model" placeholder** — it will
**never** render a fake primitive character.

> **Samples ship already:** all three default learners (`claire-base.vrm`,
> `coby-base.vrm`, `hailee-base.vrm`) use the same license-clear pixiv three-vrm
> anime model (see `../../../ASSET_SOURCES.md`), so every learner shows a real 3D
> anime character out of the box. **They look identical on purpose** — drop in
> your own VRoid export for each kid (same filenames) to give them distinct
> characters. Each is ~10 MB — optimize or swap for lighter models when you can.

## Per-learner models (recommended)

Name each file `<kidId>-base.vrm`. The default learners use these ids:

- `claire-base.vrm`
- `coby-base.vrm`
- `hailee-base.vrm`

(For children you add later, the id is shown in the grown-up area; use
`<that-id>-base.vrm`. If a learner has no per-kid file, the app falls back to a
body-type model if present — `girl-base-01.vrm`, `boy-base-01.vrm`,
`neutral-base-01.vrm` — otherwise the placeholder.)

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
