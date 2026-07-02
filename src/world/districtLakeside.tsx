// ---------------------------------------------------------------------------
// districtLakeside — LAKESIDE & BEACH district for the big-map expansion.
// A sandy shore wraps a round blue lake; a wooden plank dock steps out over
// the water, palms line the beach, and a few tents/benches/rocks make a cozy
// seaside camp. Box: x∈[-24,24], z∈[40,80], center ~(0,58). A clear corridor
// along x~0 on the town-facing side (z 40..46) is left open for the road.
// ---------------------------------------------------------------------------
import { Prop, Scatter, GroundPatch, type Placement } from "./worldProps";
import { clayPath } from "./generatedAssets";

// Palms ringing the shore (kept off the x~0 town corridor near the front edge).
const PALMS: Placement[] = [
  { x: -16, z: 50, rotationY: 0.3, scale: 1.0 },
  { x: -19, z: 60, rotationY: 1.2, scale: 1.1 },
  { x: -15, z: 70, rotationY: 2.1, scale: 0.95 },
  { x: -8, z: 74, rotationY: 0.6, scale: 1.05 },
  { x: 8, z: 74, rotationY: 2.6, scale: 1.0 },
  { x: 15, z: 70, rotationY: 1.9, scale: 1.1 },
  { x: 19, z: 60, rotationY: 0.9, scale: 0.95 },
  { x: 16, z: 50, rotationY: 3.0, scale: 1.05 },
];

// Beach rocks clustered near the waterline on either side.
const ROCKS: Placement[] = [
  { x: -12, z: 53, rotationY: 0.4, scale: 1.0 },
  { x: -10, z: 55, rotationY: 1.5, scale: 0.8 },
  { x: 11, z: 52, rotationY: 2.2, scale: 0.9 },
  { x: 13, z: 55, rotationY: 0.7, scale: 1.1 },
];

// Little scatter of flowers up on the dry sand.
const FLOWERS: Placement[] = [
  { x: -6, z: 49, rotationY: 0.5 },
  { x: 6, z: 49, rotationY: 1.8 },
  { x: -13, z: 48, rotationY: 2.4 },
];

export function LakesideDistrict() {
  return (
    <group>
      {/* Sandy shore — big tan patch under the town-facing side so sand meets water */}
      <GroundPatch x={0} z={54} r={24} color="#e9d6a8" y={0.006} />

      {/* The lake — round blue water sitting on top of the sand */}
      <GroundPatch x={0} z={64} r={17} color="#5db4d6" y={0.008} />

      {/* Wooden dock: plank rectangles stepping from the shore out over the water */}
      <GroundPatch x={0} z={52} w={3} d={5} color="#b98a54" y={0.02} />
      <GroundPatch x={0} z={57} w={3} d={5} color="#b98a54" y={0.02} />
      <GroundPatch x={0} z={62} w={3} d={5} color="#b98a54" y={0.02} />
      <GroundPatch x={0} z={66} w={3} d={5} color="#b98a54" y={0.02} />

      {/* Palms along the beach */}
      <Scatter url="/assets/world/palm.glb" items={PALMS} height={5} />

      {/* Beach camp: clay tents + a community tent, framing the shore */}
      <Prop url={clayPath("clay-tent")} position={[-14, 0, 63]} rotationY={0.6} height={2.6} />
      <Prop url={clayPath("clay-tent")} position={[14, 0, 66]} rotationY={-0.8} height={2.6} />
      <Prop url="/assets/world/tent.glb" position={[-11, 0, 70]} rotationY={2.2} height={2.2} />

      {/* Benches facing the water */}
      <Prop url={clayPath("clay-bench")} position={[-6, 0, 51]} rotationY={0} height={0.9} />
      <Prop url={clayPath("clay-bench")} position={[6, 0, 51]} rotationY={0} height={0.9} />

      {/* Rocks + a big hero rock + a beached log */}
      <Scatter url="/assets/world/rock.glb" items={ROCKS} height={0.8} />
      <Prop url="/assets/world/rock-large.glb" position={[17, 0, 64]} rotationY={0.5} height={2.2} />
      <Prop url="/assets/world/log.glb" position={[9, 0, 58]} rotationY={1.1} height={0.9} />

      {/* Planter accents on the dry sand */}
      <Prop url={clayPath("clay-planter")} position={[-8, 0, 47]} rotationY={0} height={0.9} />
      <Prop url={clayPath("clay-planter")} position={[8, 0, 47]} rotationY={0} height={0.9} />

      {/* Flower touches */}
      <Scatter url="/assets/world/flowers.glb" items={FLOWERS} height={0.5} />

      {/* Signpost marker at the town-facing edge (on the road corridor's edge) */}
      <Prop url="/assets/world/signpost.glb" position={[0, 0, 44]} rotationY={0} height={2} />
    </group>
  );
}
