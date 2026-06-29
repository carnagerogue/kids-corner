// ---------------------------------------------------------------------------
// Proximity labels — instead of every shop, landmark, NPC and creature shouting
// its name at once (a wall of floating tags), a name only fades in when the
// player walks near it. The Rig publishes the live player position to
// WORLD_PLAYER each frame; each <ProximityHtml> reads it and eases its own DOM
// opacity, so there's no per-frame React re-render and usually only 0–2 labels
// are visible. Keeps the same CSS as before — just gated by distance.
// ---------------------------------------------------------------------------
import { useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Live player position, written by the Rig once per frame. */
export const WORLD_PLAYER = { x: 0, z: 0 };

export function ProximityHtml({
  position = [0, 0, 0],
  radius = 7,
  distanceFactor = 11,
  yOffset = 0,
  children,
}: {
  position?: readonly [number, number, number];
  /** Player distance (world units) at which the label is fully shown. */
  radius?: number;
  distanceFactor?: number;
  /** Lift the label above the anchor. */
  yOffset?: number;
  children: React.ReactNode;
}) {
  const grp = useRef<THREE.Group>(null);
  const div = useRef<HTMLDivElement>(null);
  const shown = useRef(0);
  const wp = useRef<THREE.Vector3 | null>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    if (!grp.current || !div.current) return;
    // Anchor world position is static — resolve it once, then reuse.
    if (!wp.current) {
      grp.current.updateWorldMatrix(true, false);
      wp.current = grp.current.getWorldPosition(new THREE.Vector3());
    }
    const w = wp.current;
    const d = Math.hypot(WORLD_PLAYER.x - w.x, WORLD_PLAYER.z - w.z);
    const target = d < radius ? 1 : 0;
    shown.current += (target - shown.current) * Math.min(1, dt * 9);
    if (shown.current < 0.003 && target === 0) shown.current = 0;
    const s = shown.current;
    const el = div.current;
    el.style.opacity = s.toFixed(3);
    el.style.transform = `scale(${(0.82 + s * 0.18).toFixed(3)})`;
    el.style.pointerEvents = s > 0.6 ? "auto" : "none";
    void tmp;
  });

  return (
    <group ref={grp} position={[position[0], position[1] + yOffset, position[2]]}>
      <Html center distanceFactor={distanceFactor} occlude={false} zIndexRange={[12, 0]}>
        <div ref={div} style={{ opacity: 0, willChange: "opacity, transform" }}>
          {children}
        </div>
      </Html>
    </group>
  );
}
