# `models/` — VRM characters

Place VRoid/VRM base characters here. The manifest expects these three ids by
default (add more freely):

- `boy-base-01.vrm`
- `girl-base-01.vrm`
- `neutral-base-01.vrm`

**Until a real `.vrm` exists at one of these paths, the avatar renders as the
built-in procedural placeholder character** (Three.js primitives, tinted by the
learner's chosen colors). Drop a real file in and it loads automatically — no code
change needed.

## Safest way to get a model
Make your own in **VRoid Studio** (free): https://vroid.com/en/studio — export as
`.vrm` and save it here. Models you create are yours (no third-party license).

You can also use clearly-licensed free models from **VRoid Hub** / **BOOTH** — but
vet each one's license first and log it in `ASSET_SOURCES.md`.

## Optimize before shipping
```bash
npx gltf-transform optimize girl-base-01.vrm girl-base-01.vrm
```
Target < ~8 MB / < 60k triangles so it stays smooth on school Chromebooks.

⚠️ Learners can customize in-app but **cannot export** models. Don't add an export
feature without re-checking every asset's redistribution license.
