#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Kids Corner — Meshy text-to-3D generator (build-time asset authoring).
//
// Drives Meshy's two-step pipeline for every model in assets.mjs:
//   preview (untextured mesh)  ->  refine (clay textures + PBR)  ->  download GLB
//
// Design goals:
//   * SAFE BY DEFAULT: no flags = --dry-run (prints the plan + credit estimate,
//     makes zero API calls, spends nothing).
//   * RESUMABLE: every task id + status is written to .state.json, so a crash,
//     a 402 (out of credits), or Ctrl-C never re-pays for finished work. Re-run
//     with --resume to pick up exactly where it stopped.
//   * KEY STAYS OUT OF GIT/CHAT: read from $MESHY_API_KEY or scripts/meshy/.env
//     (both gitignored). Never printed.
//
// Usage:
//   node scripts/meshy/generate.mjs                 # dry run (plan only)
//   node scripts/meshy/generate.mjs --run           # generate everything
//   node scripts/meshy/generate.mjs --run --only clay-tree,clay-shop
//   node scripts/meshy/generate.mjs --run --resume  # continue an interrupted run
//   node scripts/meshy/generate.mjs --run --concurrency 3
// ---------------------------------------------------------------------------

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSETS, previewBody, refineBody, fullPrompt } from "./assets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const RAW_DIR = join(HERE, ".raw");                                  // gitignored, pre-optimize
const OUT_DIR = join(REPO, "public", "assets", "world", "generated"); // committed, app-served
const STATE_FILE = join(HERE, ".state.json");
const API = "https://api.meshy.ai/openapi/v2/text-to-3d";
// Rough Meshy-6 cost: ~5 credits preview + ~15 refine (+PBR). Estimate only.
const EST_CREDITS_PER_ASSET = 20;

// ---- CLI ------------------------------------------------------------------
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };
const DRY = !has("--run");
const RESUME = has("--resume");
const CONCURRENCY = Math.max(1, Math.min(8, parseInt(val("--concurrency", "3"), 10) || 3));
const ONLY = (val("--only", "") || "").split(",").map((s) => s.trim()).filter(Boolean);
const POLL_MS = 5000;
const TIMEOUT_MS = 12 * 60 * 1000; // per task; Meshy models can take minutes

const selected = ONLY.length ? ASSETS.filter((a) => ONLY.includes(a.id)) : ASSETS;
if (ONLY.length && selected.length !== ONLY.length) {
  const found = new Set(selected.map((a) => a.id));
  const missing = ONLY.filter((id) => !found.has(id));
  fail(`Unknown --only id(s): ${missing.join(", ")}`);
}

// ---- key ------------------------------------------------------------------
function loadKey() {
  if (process.env.MESHY_API_KEY) return process.env.MESHY_API_KEY.trim();
  const envPath = join(HERE, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*MESHY_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  return null;
}

// ---- state ----------------------------------------------------------------
function loadState() {
  if (RESUME && existsSync(STATE_FILE)) {
    try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); } catch { /* corrupt -> fresh */ }
  }
  return {};
}
let state = loadState();
function saveState() { writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)); }

// ---- helpers --------------------------------------------------------------
function fail(msg) { console.error(`\n✖ ${msg}\n`); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body, key) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {                       // rate limited -> backoff
      const wait = Math.min(30000, 2000 * 2 ** attempt);
      console.warn(`  · rate limited, waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    const text = await res.text();
    let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (res.status === 402) fail("Meshy says: insufficient credits (402). Top up, then re-run with --resume.");
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${data.message || text}`);
    return data;
  }
}

async function pollTask(id, key, label) {
  const started = Date.now();
  let lastProgress = -1;
  for (;;) {
    const t = await api("GET", `/${id}`, null, key);
    if (typeof t.progress === "number" && t.progress !== lastProgress) {
      process.stdout.write(`\r  ${label} … ${t.progress}%   `);
      lastProgress = t.progress;
    }
    if (t.status === "SUCCEEDED") { process.stdout.write("\n"); return t; }
    if (t.status === "FAILED" || t.status === "CANCELED")
      throw new Error(`${label} ${t.status}: ${t.task_error?.message || "no detail"}`);
    if (Date.now() - started > TIMEOUT_MS) throw new Error(`${label} timed out after ${TIMEOUT_MS / 60000}min`);
    await sleep(POLL_MS);
  }
}

function taskId(data) { return data.result || data.id; } // POST returns { result } or { id }

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  return buf.length;
}

// ---- one asset: preview -> refine -> download -----------------------------
async function generate(asset, key) {
  const s = (state[asset.id] ||= { id: asset.id });
  const rawPath = join(RAW_DIR, `${asset.id}.glb`);
  const outPath = join(OUT_DIR, `${asset.id}.glb`);

  if (s.done && existsSync(outPath)) { console.log(`✓ ${asset.id} (cached)`); return s; }

  // 1) preview
  if (!s.previewId) {
    const data = await api("POST", "", previewBody(asset), key);
    s.previewId = taskId(data); saveState();
  }
  if (s.previewStatus !== "SUCCEEDED") {
    await pollTask(s.previewId, key, `${asset.id} preview`);
    s.previewStatus = "SUCCEEDED"; saveState();
  }

  // 2) refine (textures)
  if (!s.refineId) {
    const data = await api("POST", "", refineBody(asset, s.previewId), key);
    s.refineId = taskId(data); saveState();
  }
  const refined = await pollTask(s.refineId, key, `${asset.id} refine`);
  s.credits = refined.consumed_credits ?? s.credits;

  // 3) download GLB
  const glbUrl = refined.model_urls?.glb;
  if (!glbUrl) throw new Error(`${asset.id}: refine finished but no GLB url`);
  const bytes = await download(glbUrl, rawPath);
  // Save Meshy's render thumbnail too, so the style can be eyeballed pre-optimize.
  if (refined.thumbnail_url) {
    try { await download(refined.thumbnail_url, join(RAW_DIR, `${asset.id}.png`)); s.thumb = join(RAW_DIR, `${asset.id}.png`); } catch { /* non-fatal */ }
  }
  // Until optimize.mjs runs, the served copy IS the raw copy (still loads fine).
  copyFileSync(rawPath, outPath);
  s.raw = rawPath; s.out = outPath; s.bytes = bytes; s.done = true; saveState();
  console.log(`✓ ${asset.id}  ${(bytes / 1024 / 1024).toFixed(1)}MB  ${s.credits ?? "?"} credits`);
  return s;
}

// ---- pool -----------------------------------------------------------------
async function runPool(items, worker, n) {
  const q = [...items]; let active = 0; const errors = [];
  return new Promise((done) => {
    const pump = () => {
      if (!q.length && active === 0) return done(errors);
      while (active < n && q.length) {
        const item = q.shift(); active++;
        worker(item).catch((e) => errors.push({ id: item.id, e }))
          .finally(() => { active--; pump(); });
      }
    };
    pump();
  });
}

// ---- main -----------------------------------------------------------------
async function main() {
  console.log(`\nKids Corner · Meshy generator`);
  console.log(`  assets: ${selected.length}${ONLY.length ? ` (--only)` : ""}   concurrency: ${CONCURRENCY}`);

  if (DRY) {
    console.log(`\n── DRY RUN (no API calls, nothing spent) ─────────────────────`);
    for (const a of selected) {
      console.log(`\n  ${a.id}  [${a.group}/${a.role}]  poly≤${a.poly ?? 10000}  pbr:${a.pbr ?? true}`);
      console.log(`    ${fullPrompt(a)}`);
    }
    console.log(`\n  Estimated cost: ~${selected.length * EST_CREDITS_PER_ASSET} credits ` +
      `(~$${(selected.length * EST_CREDITS_PER_ASSET * 0.02).toFixed(0)} at $0.02/credit).`);
    console.log(`\n  To generate for real:`);
    console.log(`    1) put your key in scripts/meshy/.env  (cp .env.example .env; gitignored)`);
    console.log(`    2) node scripts/meshy/generate.mjs --run`);
    console.log(`  Then optimize + wire:  node scripts/meshy/optimize.mjs\n`);
    return;
  }

  const key = loadKey();
  if (!key) fail(
    "No Meshy API key. Set it without pasting it anywhere public:\n" +
    "   cp scripts/meshy/.env.example scripts/meshy/.env\n" +
    "   # edit .env and set MESHY_API_KEY=...   (this file is gitignored)\n" +
    "   node scripts/meshy/generate.mjs --run"
  );

  mkdirSync(RAW_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const errors = await runPool(selected, (a) => generate(a, key), CONCURRENCY);

  // provenance manifest for ASSET_SOURCES.md + the in-app registry
  const done = selected.filter((a) => state[a.id]?.done);
  writeFileSync(join(OUT_DIR, "ASSETS.json"), JSON.stringify({
    generator: "meshy", ai_model: "meshy-6", generatedCount: done.length,
    assets: done.map((a) => ({ id: a.id, group: a.group, role: a.role, prompt: fullPrompt(a), credits: state[a.id]?.credits })),
  }, null, 2));

  const spent = done.reduce((n, a) => n + (state[a.id]?.credits || 0), 0);
  console.log(`\n── done: ${done.length}/${selected.length} assets, ~${spent} credits spent ──`);
  if (errors.length) {
    console.log(`\n${errors.length} failed (re-run with --resume to retry only these):`);
    for (const { id, e } of errors) console.log(`  ✖ ${id}: ${e.message}`);
    process.exit(1);
  }
}

main().catch((e) => fail(e.stack || e.message));
