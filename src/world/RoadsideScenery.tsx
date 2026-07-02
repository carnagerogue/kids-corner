// ---------------------------------------------------------------------------
// RoadsideScenery — makes the enlarged (8×) world feel lived-in end to end.
// Fills the open mid-ring and the diagonal corners with countryside scatter
// (trees, bushes, flowers, rocks), and lines the four connector roads with lamp
// posts + trees, so travelling out to a district reads as a route through a
// landscape rather than a walk across an empty lawn.
//
// Placement is DETERMINISTIC (a tiny seeded RNG) — stable across reloads, and no
// Math.random at render (matches the codebase's determinism rule). Everything is
// generated once at module load and kept well clear of the town, the road lanes,
// and the four district zones so nothing overlaps existing content.
// ---------------------------------------------------------------------------
import { Scatter, type Placement } from "./worldProps";
import { clayPath } from "./generatedAssets";

/** Deterministic pseudo-random in [0,1) from an integer seed (mulberry32-ish). */
function rng(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Where scatter must NOT go: town core, map edge, the 4 road lanes, the 4
 *  district zones. What's left is the open mid-ring + the diagonal corners. */
function blocked(x: number, z: number): boolean {
  const r = Math.hypot(x, z);
  if (r < 27 || r > 76) return true;
  if (Math.abs(x) < 5 && Math.abs(z) < 46) return true; // N/S connector roads
  if (Math.abs(z) < 5 && Math.abs(x) < 46) return true; // E/W connector roads
  if (x >= -26 && x <= 26 && z <= -36) return true; // Downtown zone (N)
  if (x >= -26 && x <= 26 && z >= 36) return true; // Lakeside zone (S)
  if (x >= 36 && z >= -26 && z <= 26) return true; // Fairground zone (E)
  if (x <= -36 && z >= -26 && z <= 26) return true; // Woods zone (W)
  return false;
}

const trees: Placement[] = [];
const clayTrees: Placement[] = [];
const bushes: Placement[] = [];
const flowers: Placement[] = [];
const rocks: Placement[] = [];

let s = 1;
for (let ring = 30; ring <= 74; ring += 5) {
  const n = Math.round(ring / 4.5);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rng(s++) * 0.6;
    const rr = ring + (rng(s++) - 0.5) * 7;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    if (blocked(x, z)) continue;
    const roll = rng(s++);
    const rot = rng(s++) * Math.PI * 2;
    if (roll < 0.2) trees.push({ x, z, rotationY: rot, height: 2.8 + rng(s++) * 1.8 });
    else if (roll < 0.32) clayTrees.push({ x, z, rotationY: rot, height: 3.0 + rng(s++) * 1.6 });
    else if (roll < 0.6) bushes.push({ x, z, rotationY: rot });
    else if (roll < 0.86) flowers.push({ x, z, rotationY: rot });
    else rocks.push({ x, z, rotationY: rot });
  }
}

// Lamp posts + trees lining the four connector roads (town edge → district).
const roadLamps: Placement[] = [];
const roadTrees: Placement[] = [];
const DIRS: [number, number][] = [
  [0, -1],
  [0, 1],
  [1, 0],
  [-1, 0],
];
for (const [dx, dz] of DIRS) {
  for (const d of [30, 40]) {
    for (const side of [-1, 1]) {
      roadLamps.push({ x: dx * d + dz * side * 4.5, z: dz * d + dx * side * 4.5, rotationY: 0 });
    }
  }
  for (const side of [-1, 1]) {
    roadTrees.push({
      x: dx * 35 + dz * side * 8,
      z: dz * 35 + dx * side * 8,
      rotationY: rng(s++) * Math.PI * 2,
      height: 3.4,
    });
  }
}

export function RoadsideScenery() {
  return (
    <group>
      <Scatter url="/assets/world/tree.glb" items={trees} />
      <Scatter url={clayPath("clay-tree")} items={clayTrees} />
      <Scatter url="/assets/world/bush.glb" items={bushes} height={1.0} />
      <Scatter url="/assets/world/flowers.glb" items={flowers} height={0.5} />
      <Scatter url="/assets/world/rock.glb" items={rocks} height={0.7} />
      <Scatter url="/assets/world/tree.glb" items={roadTrees} />
      <Scatter url={clayPath("clay-streetlamp")} items={roadLamps} height={3} />
    </group>
  );
}
