// ---------------------------------------------------------------------------
// districtDowntown — the DOWNTOWN block of the outer world map. A denser urban
// scene: a grey-tan paved plaza with a north-south main street, the clay Town
// Hall as its civic centerpiece facing back toward town, and two rows of shops
// and homes flanking the street. Streetlamps, benches and mailboxes give it the
// lived-in "downtown" read.
//
// Box: x in [-24, 24], z in [-80, -40], center ~(0, -58).
// A ~6-wide corridor along x~0 on the town-facing (+z) side (z from -40 to -46)
// is kept clear for the connecting road.
// ---------------------------------------------------------------------------
import { Prop, Scatter, GroundPatch, type Placement } from "./worldProps";
import { clayPath } from "./generatedAssets";

// Streetlamps lining both sides of the main street, marching north.
const STREETLAMPS: Placement[] = [
  { x: -4, z: -50, rotationY: Math.PI / 2 },
  { x: 4, z: -50, rotationY: -Math.PI / 2 },
  { x: -4, z: -58, rotationY: Math.PI / 2 },
  { x: 4, z: -58, rotationY: -Math.PI / 2 },
  { x: -4, z: -66, rotationY: Math.PI / 2 },
  { x: 4, z: -66, rotationY: -Math.PI / 2 },
];

export function DowntownDistrict() {
  return (
    <group>
      {/* Paved civic plaza + a north-south main street. */}
      <GroundPatch x={0} z={-58} r={20} color="#d9cdb2" y={0.006} />
      <GroundPatch x={0} z={-58} w={6} d={40} color="#cfc3a6" y={0.012} />
      <GroundPatch x={0} z={-48} w={18} d={6} color="#cfc3a6" y={0.012} />

      {/* Centerpiece: the Town Hall, set at the far end facing town. */}
      <Prop url={clayPath("clay-town-hall")} position={[0, 0, -66]} rotationY={0} height={9} />

      {/* --- West block (x ~ -14): shops & homes facing the street (east). --- */}
      <Prop url={clayPath("clay-shop")} position={[-14, 0, -50]} rotationY={Math.PI / 2} height={5} />
      <Prop url={clayPath("clay-library")} position={[-14, 0, -58]} rotationY={Math.PI / 2} height={6} />
      <Prop url={clayPath("clay-cottage")} position={[-14, 0, -66]} rotationY={Math.PI / 2} height={4.5} />
      <Prop url="/assets/world/house.glb" position={[-14, 0, -73]} rotationY={Math.PI / 2} height={4.5} />

      {/* --- East block (x ~ +14): shops & homes facing the street (west). --- */}
      <Prop url={clayPath("clay-workshop")} position={[14, 0, -50]} rotationY={-Math.PI / 2} height={5} />
      <Prop url="/assets/world/shop.glb" position={[14, 0, -58]} rotationY={-Math.PI / 2} height={5} />
      <Prop url="/assets/world/house-modern.glb" position={[14, 0, -66]} rotationY={-Math.PI / 2} height={5.5} />
      <Prop url={clayPath("clay-cottage")} position={[14, 0, -73]} rotationY={-Math.PI / 2} height={4.5} />

      {/* Streetlamps lining the main street. */}
      <Scatter url={clayPath("clay-streetlamp")} items={STREETLAMPS} height={3} />

      {/* Street furniture — benches, mailbox, planters. */}
      <Prop url={clayPath("clay-bench")} position={[-3, 0, -54]} rotationY={Math.PI / 2} height={1} />
      <Prop url={clayPath("clay-bench")} position={[3, 0, -62]} rotationY={-Math.PI / 2} height={1} />
      <Prop url={clayPath("clay-mailbox")} position={[3, 0, -54]} rotationY={-Math.PI / 2} height={1} />
      <Prop url={clayPath("clay-planter")} position={[-3, 0, -62]} rotationY={0} height={1} />
      <Prop url={clayPath("clay-planter")} position={[-6, 0, -70]} rotationY={0} height={1} />

      {/* Town-facing marker signpost at the corridor mouth. */}
      <Prop url="/assets/world/signpost.glb" position={[0, 0, -44]} rotationY={0} height={2} />
    </group>
  );
}
