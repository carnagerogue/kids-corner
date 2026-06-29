// ---------------------------------------------------------------------------
// TownGround — the cohesive paved layer that turns the bare grid into a town:
//   • a round central plaza (concentric stone rings) around the fountain/mayor
//   • four grand avenues from the plaza out to the shop rows
//   • four diagonal park paths from the plaza to the landmarks (±8,±8)
//   • a rounded perimeter sidewalk linking the 12 shopfronts
//   • crosswalk inlays at the avenue/plaza junctions
//
// Everything is flat, low-poly geometry layered in tiny Y steps to avoid
// z-fighting — a couple dozen draw calls, cheap on tablets. Pure cosmetics: no
// gameplay anchor (mayor/landmarks/shops/stars) moves, so interactions, the
// minimap, and colliders are untouched.
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import { FOUNTAIN } from "./WorldContent";

// Palette (kept as plain hex so it reads at a glance).
const GRASS_PARK = "#7cba5d";
const PLAZA_FIELD = "#ead9b4";
const PLAZA_RING = "#f1e6cb";
const PLAZA_MEDALLION = "#e9b988";
const AVENUE = "#e4d3ad";
const SIDEWALK = "#f2ead7";
const PATH = "#e9dcbb";
const CROSSWALK = "#fbf4e4";
const CURB = "#cdbb91";

const PLAZA_R = 8.6; // plaza radius — wraps the fountain (0,-3) + mayor (0,2.2)
const AVE_HALF = 2.7; // half-width of an avenue
const PERIM = 20; // perimeter ring distance (just inside the ±24 shopfronts)
const PERIM_HALF = 2.0; // half-width of the perimeter sidewalk band

/** A flat slab on the ground. y is layered so later (higher) pieces win. */
function Slab({
  w,
  d,
  x,
  z,
  y,
  color,
  rot = 0,
  receive = true,
}: {
  w: number;
  d: number;
  x: number;
  z: number;
  y: number;
  color: string;
  rot?: number;
  receive?: boolean;
}) {
  return (
    <mesh
      position={[x, y, z]}
      rotation={[-Math.PI / 2, 0, rot]}
      receiveShadow={receive}
    >
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

/** A flat disc (plaza rings, medallion). */
function Disc({
  r,
  x,
  z,
  y,
  color,
}: {
  r: number;
  x: number;
  z: number;
  y: number;
  color: string;
}) {
  return (
    <mesh position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[r, 48]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Crosswalk({ x, z, rot }: { x: number; z: number; rot: number }) {
  // Five stripes across an avenue mouth.
  return (
    <group position={[x, 0.05, z]} rotation={[0, rot, 0]}>
      {[-2.2, -1.1, 0, 1.1, 2.2].map((o) => (
        <mesh key={o} position={[o, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.55, 2.2]} />
          <meshStandardMaterial color={CROSSWALK} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

export function TownGround() {
  // Avenue + path geometry is static; memo the derived numbers once.
  const aveLen = PERIM - (PLAZA_R - 1.2); // overlap the plaza edge a touch
  const aveMid = (PERIM + (PLAZA_R - 1.2)) / 2;

  // Diagonal paths from the plaza to each landmark corner (±8,±8). The landmark
  // sits ~11.3 from centre, just past the plaza rim — a short connector.
  const diagonals = useMemo(
    () =>
      [
        [-8, -8],
        [8, -8],
        [8, 8],
        [-8, 8],
      ].map(([lx, lz]) => {
        const ang = Math.atan2(lz, lx);
        const from = PLAZA_R - 1.0;
        const to = Math.hypot(lx, lz) + 1.2;
        const len = to - from;
        const mid = (to + from) / 2;
        return {
          x: Math.cos(ang) * mid,
          z: Math.sin(ang) * mid,
          len,
          rot: -ang, // plane rotated about Y to align its length with the ray
        };
      }),
    [],
  );

  return (
    <group>
      {/* Quadrant park grass — four soft lawns filling the diagonal gaps so the
          landmarks sit on green, not bare paving. Large squares under everything. */}
      {[
        [-15.5, -15.5],
        [15.5, -15.5],
        [15.5, 15.5],
        [-15.5, 15.5],
      ].map(([x, z], i) => (
        <Slab key={`park${i}`} w={18} d={18} x={x} z={z} y={0.004} color={GRASS_PARK} />
      ))}

      {/* Perimeter sidewalk band linking the shopfronts (rounded square = 4 strips
          + 4 corner discs). Sits just inside the ±24 shops. */}
      {[
        { w: 2 * PERIM + 2 * PERIM_HALF, d: 2 * PERIM_HALF, x: 0, z: -PERIM },
        { w: 2 * PERIM + 2 * PERIM_HALF, d: 2 * PERIM_HALF, x: 0, z: PERIM },
        { w: 2 * PERIM_HALF, d: 2 * PERIM, x: -PERIM, z: 0 },
        { w: 2 * PERIM_HALF, d: 2 * PERIM, x: PERIM, z: 0 },
      ].map((s, i) => (
        <Slab key={`perim${i}`} w={s.w} d={s.d} x={s.x} z={s.z} y={0.01} color={SIDEWALK} />
      ))}

      {/* Four grand avenues: plaza → shop rows along the cardinal axes. A stone
          roadbed with a lighter sidewalk strip down each side. */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a, i) => {
        const x = Math.cos(a) * aveMid;
        const z = Math.sin(a) * aveMid;
        const horizontal = i % 2 === 0;
        return (
          <group key={`ave${i}`}>
            <Slab
              w={horizontal ? aveLen : 2 * AVE_HALF}
              d={horizontal ? 2 * AVE_HALF : aveLen}
              x={x}
              z={z}
              y={0.012}
              color={AVENUE}
            />
            {/* sidewalk strips either side of the carriageway */}
            {[-1, 1].map((side) => (
              <Slab
                key={side}
                w={horizontal ? aveLen : 1.1}
                d={horizontal ? 1.1 : aveLen}
                x={x + (horizontal ? 0 : side * (AVE_HALF + 0.55))}
                z={z + (horizontal ? side * (AVE_HALF + 0.55) : 0)}
                y={0.016}
                color={SIDEWALK}
              />
            ))}
          </group>
        );
      })}

      {/* Diagonal park paths to the four landmarks. */}
      {diagonals.map((d, i) => (
        <Slab
          key={`diag${i}`}
          w={d.len}
          d={2.6}
          x={d.x}
          z={d.z}
          y={0.012}
          color={PATH}
          rot={d.rot}
        />
      ))}

      {/* Central plaza: concentric stone rings + a warm medallion under the
          fountain, with a curb rim so it reads as a designed square. */}
      <Disc r={PLAZA_R + 0.4} x={0} z={0} y={0.018} color={CURB} />
      <Disc r={PLAZA_R} x={0} z={0} y={0.022} color={PLAZA_FIELD} />
      <Disc r={PLAZA_R * 0.74} x={0} z={0} y={0.026} color={PLAZA_RING} />
      <Disc r={PLAZA_R * 0.46} x={0} z={0} y={0.03} color={PLAZA_FIELD} />
      <Disc r={3.0} x={FOUNTAIN.x} z={FOUNTAIN.z} y={0.034} color={PLAZA_MEDALLION} />

      {/* Crosswalks where each avenue meets the perimeter. */}
      <Crosswalk x={0} z={-PERIM + 0.2} rot={0} />
      <Crosswalk x={0} z={PERIM - 0.2} rot={0} />
      <Crosswalk x={-PERIM + 0.2} z={0} rot={Math.PI / 2} />
      <Crosswalk x={PERIM - 0.2} z={0} rot={Math.PI / 2} />
    </group>
  );
}
