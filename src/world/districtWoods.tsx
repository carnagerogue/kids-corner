// ---------------------------------------------------------------------------
// districtWoods — the Woods & Nature Trail district of the outer world map.
// A dense little forest west of town: clay + community trees, a mushroom-and-
// bush understory, a small pond, a campfire clearing, and a winding dirt trail
// that threads back toward the town corridor (kept clear along z~0, x -46..-40).
//
// Pure declarative placement using the shared world helpers — no state, no
// useFrame, deterministic layout. Total Prop placements are kept within the
// district budget (~33) by favouring a few dense clusters over a full grid.
// ---------------------------------------------------------------------------
import { Prop, Scatter, GroundPatch, Road, type Placement } from "./worldProps";
import { clayPath } from "./generatedAssets";

// --- Forest canopy: mixed community + clay trees, spread across the box but
// avoiding the town corridor (z in [-3,3] on the +x edge, x > -50). -----------
const OAKS: Placement[] = [
  { x: -74, z: -18, rotationY: 0.4, height: 4.6 },
  { x: -66, z: -12, rotationY: 1.9, height: 4.2 },
  { x: -78, z: -4, rotationY: 2.7, height: 4.8 },
  { x: -63, z: 16, rotationY: 3.4, height: 4.0 },
  { x: -52, z: -14, rotationY: 0.6, height: 4.1 },
];

const PINES: Placement[] = [
  { x: -72, z: -22, rotationY: 0.2, height: 5.0 },
  { x: -78, z: 6, rotationY: 1.1, height: 4.8 },
  { x: -64, z: 22, rotationY: 2.4, height: 4.6 },
  { x: -50, z: 18, rotationY: 3.0, height: 4.2 },
  { x: -80, z: -12, rotationY: 0.5, height: 4.9 },
];

const CLAY_TREES: Placement[] = [
  { x: -70, z: -16, rotationY: 1.0, height: 4.4 },
  { x: -60, z: 12, rotationY: 0.3, height: 4.2 },
  { x: -80, z: -18, rotationY: 0.8, height: 4.3 },
  { x: -72, z: 12, rotationY: 2.3, height: 4.6 },
];

const CLAY_PINES: Placement[] = [
  { x: -78, z: 18, rotationY: 1.7, height: 5.0 },
  { x: -58, z: 20, rotationY: 2.5, height: 4.6 },
  { x: -80, z: 10, rotationY: 2.0, height: 4.9 },
  { x: -62, z: -16, rotationY: 0.4, height: 4.5 },
];

// Trees framing the trail entrance (town-facing edge, ~x -46..-53) so arriving
// from the road you step INTO the woods rather than onto bare grass.
const ENTRANCE_TREES: Placement[] = [
  { x: -48, z: -8, rotationY: 0.6, height: 4.6 },
  { x: -49, z: 9, rotationY: 2.1, height: 4.2 },
  { x: -53, z: -12, rotationY: 1.4, height: 5.0 },
  { x: -52, z: 13, rotationY: 0.3, height: 4.7 },
];

// --- Understory: bushes scattered through the trees. -------------------------
const BUSHES: Placement[] = [
  { x: -71, z: -10, rotationY: 0.5 },
  { x: -57, z: 6, rotationY: 0.9 },
  { x: -69, z: 14, rotationY: 3.0 },
  { x: -75, z: 10, rotationY: 2.7 },
];

// --- Mushrooms: tiny clusters, mixed community + clay. -----------------------
const MUSHROOMS: Placement[] = [
  { x: -67, z: -13, rotationY: 0.3 },
  { x: -59, z: 9, rotationY: 2.6 },
];

const CLAY_MUSHROOMS: Placement[] = [
  { x: -70, z: 6, rotationY: 1.9 },
  { x: -76, z: -14, rotationY: 2.2 },
];

// --- Ground clutter: fallen logs + rocks. ------------------------------------
const LOGS: Placement[] = [
  { x: -72, z: 10, rotationY: 0.9 },
  { x: -60, z: -12, rotationY: 2.1 },
];

const ROCKS: Placement[] = [
  { x: -75, z: 16, rotationY: 0.4 },
  { x: -69, z: -18, rotationY: 2.5 },
];

// --- Rocks ringing the pond (centered at (-64, -12)). ------------------------
const POND_ROCKS: Placement[] = [
  { x: -68, z: -12, rotationY: 0.2, height: 0.7 },
  { x: -64, z: -8, rotationY: 1.5, height: 0.6 },
  { x: -60, z: -12, rotationY: 2.8, height: 0.7 },
];

// --- Campfire clearing seat logs (fire at (-56, 4)). -------------------------
const FIRE_LOGS: Placement[] = [
  { x: -53, z: 4, rotationY: Math.PI / 2, height: 0.9 },
  { x: -59, z: 4, rotationY: Math.PI / 2, height: 0.9 },
];

export function WoodsDistrict() {
  return (
    <group>
      {/* Forest floor */}
      <GroundPatch x={-58} z={0} r={20} color="#5f9e4a" />

      {/* Small pond, tucked into the northwest of the clearing */}
      <GroundPatch x={-64} z={-12} r={5} color="#4f9fd0" y={0.01} />

      {/* Winding dirt trail from the town corridor edge through the woods */}
      <Road from={[-46, 0]} to={[-54, 4]} width={3} color="#c8a878" />
      <Road from={[-54, 4]} to={[-62, -4]} width={3} color="#c8a878" />
      <Road from={[-62, -4]} to={[-70, 6]} width={3} color="#c8a878" />
      <Road from={[-70, 6]} to={[-76, -6]} width={3} color="#c8a878" />

      {/* Canopy — community + clay trees */}
      <Scatter url="/assets/world/tree.glb" items={OAKS} />
      <Scatter url="/assets/world/pine.glb" items={PINES} />
      <Scatter url={clayPath("clay-tree")} items={CLAY_TREES} />
      <Scatter url={clayPath("clay-pine")} items={CLAY_PINES} />
      <Scatter url="/assets/world/tree.glb" items={ENTRANCE_TREES} />

      {/* Understory */}
      <Scatter url="/assets/world/bush.glb" items={BUSHES} height={1.1} />
      <Scatter url="/assets/world/mushroom.glb" items={MUSHROOMS} height={0.6} />
      <Scatter url={clayPath("clay-mushroom")} items={CLAY_MUSHROOMS} height={0.6} />

      {/* Ground clutter */}
      <Scatter url="/assets/world/log.glb" items={LOGS} height={0.9} />
      <Scatter url="/assets/world/rock.glb" items={ROCKS} height={0.8} />

      {/* Pond edge rocks */}
      <Scatter url="/assets/world/rock.glb" items={POND_ROCKS} />

      {/* Campfire clearing */}
      <Prop url={clayPath("clay-campfire")} position={[-56, 0, 4]} height={1.4} />
      <Scatter url="/assets/world/log.glb" items={FIRE_LOGS} />

      {/* Town-facing marker */}
      <Prop url="/assets/world/signpost.glb" position={[-44, 0, 0]} rotationY={-Math.PI / 2} height={2} />
    </group>
  );
}
