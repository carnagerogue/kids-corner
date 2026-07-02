// ---------------------------------------------------------------------------
// districtFairground — the Fairground & Festival district on the big map.
//
// Box: x in [40,80], z in [-24,24], center ~(58,0). A warm sand-lit fairground:
// a festival arch greets you from the town side, a row of game stalls lines the
// north edge, a campfire-and-tents cluster warms the middle, and a little prize
// podium shows off the trophy. Lanterns and flowers dot the grounds.
//
// The town-facing corridor (x 40..46 along z~0) is kept clear for the connecting
// road — only the signpost + arch sit on that axis, both off the travel lane.
// ---------------------------------------------------------------------------
import { Prop, Scatter, GroundPatch, type Placement } from "./worldProps";
import { clayPath } from "./generatedAssets";

// Five game stalls along the north side, facing south (into the fair, +z).
const STALLS: { x: number; z: number; clay: boolean }[] = [
  { x: 49, z: -13, clay: true },
  { x: 55, z: -14, clay: false },
  { x: 61, z: -14, clay: true },
  { x: 67, z: -14, clay: false },
  { x: 73, z: -13, clay: true },
];

// Lanterns strung around the fairground ring.
const LANTERNS: Placement[] = [
  { x: 48, z: -6 },
  { x: 47, z: 7 },
  { x: 53, z: 13 },
  { x: 62, z: 15 },
  { x: 70, z: 12 },
  { x: 74, z: 3 },
  { x: 72, z: -8 },
  { x: 58, z: -5 },
];

// Bright flowers — community blooms clustered at the edges.
const FLOWERS: Placement[] = [
  { x: 45, z: -11, rotationY: 0.4 },
  { x: 50, z: 16, rotationY: 1.1 },
  { x: 64, z: 17, rotationY: 2.2 },
  { x: 76, z: -3, rotationY: 0.8 },
  { x: 71, z: 17, rotationY: 1.7 },
  { x: 44, z: 12, rotationY: 3.0 },
];

// Clay flower clusters — a few richer accents at the entrance and podium.
const CLAY_FLOWERS: Placement[] = [
  { x: 51, z: -3, rotationY: 0.6 },
  { x: 54, z: 8, rotationY: 2.0 },
  { x: 67, z: 6, rotationY: 1.3 },
  { x: 73, z: -4, rotationY: 2.6 },
];

export function FairgroundDistrict() {
  return (
    <group>
      {/* Warm festive ground */}
      <GroundPatch x={58} z={0} r={20} color="#e7c98f" />

      {/* Festival arch — a grand backdrop at the FAR side facing town (-x), so it
          frames the whole fair on approach without the chase camera clipping
          through it at the entrance. */}
      <Prop url={clayPath("clay-festival-arch")} position={[72, 0, 0]} rotationY={-Math.PI / 2} height={7} />

      {/* Town-facing marker. */}
      <Prop url="/assets/world/signpost.glb" position={[44, 0, 0]} rotationY={-Math.PI / 2} height={2} />

      {/* Row of game stalls along the north side, facing into the fair. */}
      {STALLS.map((s, i) => (
        <Prop
          key={i}
          url={s.clay ? clayPath("clay-market-stall") : "/assets/world/stall.glb"}
          position={[s.x, 0, s.z]}
          rotationY={0}
          height={3}
        />
      ))}

      {/* Campfire heart of the fair, with tents flanking it. */}
      <Prop url={clayPath("clay-campfire")} position={[58, 0, 4]} height={1.4} />
      <Prop url={clayPath("clay-tent")} position={[50, 0, 8]} rotationY={0.5} height={2.2} />
      <Prop url="/assets/world/tent.glb" position={[66, 0, 8]} rotationY={-0.5} height={2.2} />

      {/* Benches around the fire. */}
      <Prop url={clayPath("clay-bench")} position={[54, 0, 2]} rotationY={Math.PI / 2} height={0.9} />
      <Prop url={clayPath("clay-bench")} position={[62, 0, 2]} rotationY={-Math.PI / 2} height={0.9} />
      <Prop url={clayPath("clay-bench")} position={[58, 0, 10]} rotationY={Math.PI} height={0.9} />

      {/* Prize podium — a raised disc with the trophy and a gift box. */}
      <GroundPatch x={70} z={-2} r={3.4} color="#d8b25e" y={0.02} />
      <Prop url={clayPath("clay-trophy")} position={[70, 0, -2]} height={1.2} />
      <Prop url={clayPath("clay-gift-box")} position={[71.6, 0, -0.6]} rotationY={0.4} height={0.8} />

      {/* Lanterns dotted around the grounds. */}
      <Scatter url={clayPath("clay-lantern")} items={LANTERNS} height={1.2} />

      {/* Bright flowers. */}
      <Scatter url="/assets/world/flowers.glb" items={FLOWERS} height={0.5} />
      <Scatter url={clayPath("clay-flower-cluster")} items={CLAY_FLOWERS} height={0.5} />
    </group>
  );
}
