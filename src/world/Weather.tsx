// ---------------------------------------------------------------------------
// Weather — gentle seasonal particles that fill the sky: spring petals, summer
// fireflies (drifting glow), autumn leaves, winter snow. Particle count is
// driven by the quality tier so low-end devices stay smooth. One Points object,
// shared geometry; falls + drifts on the CPU but with a small, capped count.
// ---------------------------------------------------------------------------
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type SeasonId = "spring" | "summer" | "autumn" | "winter";

const SEASONS: Record<
  SeasonId,
  { color: string; fall: number; size: number; additive: boolean; float: boolean }
> = {
  spring: { color: "#ffc0d8", fall: 0.85, size: 0.16, additive: false, float: false },
  summer: { color: "#fff39a", fall: 0.0, size: 0.13, additive: true, float: true },
  autumn: { color: "#e8893a", fall: 1.05, size: 0.18, additive: false, float: false },
  winter: { color: "#ffffff", fall: 0.7, size: 0.13, additive: false, float: false },
};

const AREA = 58; // spread across the whole neighbourhood
const TOP = 16;

export function Weather({ season, count }: { season: SeasonId; count: number }) {
  const cfg = SEASONS[season] ?? SEASONS.winter;
  const points = useRef<THREE.Points>(null);
  const n = Math.max(0, Math.min(count, 120));

  const positions = useMemo(() => {
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = (Math.random() - 0.5) * AREA;
      a[i * 3 + 1] = Math.random() * TOP;
      a[i * 3 + 2] = (Math.random() - 0.5) * AREA;
    }
    return a;
  }, [n]);
  const speeds = useMemo(
    () => Array.from({ length: n }, () => 0.6 + Math.random() * 0.9),
    [n],
  );

  useFrame(({ clock }, dt) => {
    const p = points.current;
    if (!p) return;
    const arr = p.geometry.attributes.position.array as Float32Array;
    const t = clock.elapsedTime;
    for (let i = 0; i < n; i++) {
      const yi = i * 3 + 1;
      if (cfg.float) {
        // fireflies: bob up and down in place, no net fall
        arr[yi] = 1.2 + ((i * 13) % 90) / 10 + Math.sin(t * 1.4 + i) * 0.6;
        arr[i * 3] += Math.sin(t * 0.5 + i) * dt * 0.4;
      } else {
        arr[yi] -= cfg.fall * speeds[i] * dt;
        arr[i * 3] += Math.sin(t * 0.7 + i * 1.3) * dt * 0.25;
        if (arr[yi] < 0.3) {
          arr[yi] = TOP;
          arr[i * 3] = (Math.random() - 0.5) * AREA;
          arr[i * 3 + 2] = (Math.random() - 0.5) * AREA;
        }
      }
    }
    p.geometry.attributes.position.needsUpdate = true;
  });

  if (n === 0) return null;
  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={cfg.size}
        color={cfg.color}
        transparent
        opacity={cfg.additive ? 0.95 : 0.8}
        depthWrite={false}
        sizeAttenuation
        blending={cfg.additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}
