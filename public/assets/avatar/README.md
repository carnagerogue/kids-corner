# `public/assets/avatar/` — drop-in asset folders

This is where real avatar assets live. **The app works with these folders empty**
— it renders a procedural character + emoji icons until you add files, then
auto-upgrades.

- Each subfolder maps to a cosmetic **slot** (see `avatar-manifest.json`).
- `models/` holds `.vrm` characters (from VRoid Studio). Everything else holds
  `.glb`/`.gltf` props or `.png` icons.
- **To add an item:** put the file here, then add an entry to
  `avatar-manifest.json`. Full steps + license rules:
  - 📄 `../../../VROID_ASSET_IMPORT_GUIDE.md`
  - 📄 `../../../ASSET_SOURCES.md` (log every asset's license here)

Paths in the manifest start with `/assets/...`; the app adds the correct base URL
(`/kids-corner/` on GitHub Pages) automatically. Never hard-code the base.
