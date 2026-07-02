#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Kids Corner — optimize generated GLBs for the web (iPad-class devices).
//
// Meshy returns clean but heavy GLBs (up to ~30k tris, 2K PBR maps). The World
// loads them with a plain three.js GLTFLoader that has NO Draco/Meshopt/KTX2
// decoder registered (see the world map), so we must NOT use those compressors
// or the models won't load. Safe, decoder-free wins only:
//   * resize every texture to <=1024 and re-encode to WebP  (the big one)
//   * weld + join + prune + dedup  (fewer draw calls, smaller buffers)
//   * center each mesh on its base so the World's fit() places it predictably
//
// Reads raw GLBs from scripts/meshy/.raw/ and writes optimized copies to
// public/assets/world/generated/ (overwriting the raw copy the generator
// staged there). Idempotent; safe to re-run.
//
// Requires (dev-only):
//   npm i -D @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions sharp
//
// Usage:  node scripts/meshy/optimize.mjs [--max 1024] [--quality 80]
// ---------------------------------------------------------------------------

import { readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RAW_DIR = join(HERE, ".raw");
const OUT_DIR = join(REPO, "public", "assets", "world", "generated");

const argv = process.argv.slice(2);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const MAX = parseInt(val("--max", "1024"), 10);
const QUALITY = parseInt(val("--quality", "80"), 10);

let core, funcs, sharp;
try {
  core = await import("@gltf-transform/core");
  funcs = await import("@gltf-transform/functions");
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "\n✖ Optimizer deps missing. Install them (dev-only), then re-run:\n" +
    "   npm i -D @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions sharp\n" +
    "   node scripts/meshy/optimize.mjs\n\n" +
    "  (Generation still works without this — raw GLBs load fine, just larger.)\n"
  );
  process.exit(1);
}

const { NodeIO } = core;
const { dedup, prune, weld, join: joinMeshes, textureCompress, center } = funcs;

async function optimizeOne(io, file) {
  const src = join(RAW_DIR, file);
  const dst = join(OUT_DIR, file);
  const before = statSync(src).size;
  const doc = await io.read(src);

  await doc.transform(
    weld(),
    joinMeshes(),
    dedup(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [MAX, MAX], quality: QUALITY }),
    center({ pivot: "below" }),   // feet on origin -> plays nice with World fit()
    prune(),
  );

  await io.write(dst, doc);
  const after = statSync(dst).size;
  console.log(`  ${basename(file).padEnd(24)} ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB`);
  return [before, after];
}

async function main() {
  if (!existsSync(RAW_DIR)) {
    console.error(`\n✖ No raw GLBs at ${RAW_DIR}. Run the generator first:\n   node scripts/meshy/generate.mjs --run\n`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".glb"));
  if (!files.length) { console.error("\n✖ No .glb files to optimize.\n"); process.exit(1); }

  const io = new NodeIO();
  console.log(`\nOptimizing ${files.length} GLBs  (textures <=${MAX}px WebP q${QUALITY})\n`);
  let before = 0, after = 0;
  for (const f of files) {
    try { const [b, a] = await optimizeOne(io, f); before += b; after += a; }
    catch (e) { console.error(`  ✖ ${f}: ${e.message}`); }
  }
  console.log(`\n── total: ${(before / 1048576).toFixed(1)}MB -> ${(after / 1048576).toFixed(1)}MB ` +
    `(${(100 * (1 - after / Math.max(1, before))).toFixed(0)}% smaller) ──\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
