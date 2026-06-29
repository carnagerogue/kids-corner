// ---------------------------------------------------------------------------
// Skyline — soft pastel buildings ringing the play area so the horizon reads as
// a town that continues past where you can walk, instead of empty fog. Three
// concentric rings (farther = taller) give parallax depth; the world fog fades
// the outer ring into a gentle haze. Two InstancedMeshes total (bodies + pyramid
// roofs), so the whole skyline is ~2 draw calls — tablet-friendly. Decorative
// only: it sits well beyond ROAM, so nothing collides with it.
// ---------------------------------------------------------------------------
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const FACADES = [
  "#f4c98a",
  "#eaa97c",
  "#f3b8c6",
  "#bcd2e8",
  "#cfe2b6",
  "#e8cfb2",
  "#d9c4e8",
  "#f5d9a2",
  "#aedcd0",
];
const ROOFS = ["#d6855c", "#c66b78", "#6f9bc4", "#7aa86a", "#b58fc4", "#e0a35c"];

// Deterministic pseudo-random so the skyline is stable across renders/reloads.
function rng(i: number, salt: number): number {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

// Sits BEHIND the authored downtown buildings (which frame ~r31–34): a dense
// pastel haze-ring that fills the rest of the horizon the few hero buildings
// leave open.
const RINGS = [
  { r: 35, count: 36, hMin: 6, hMax: 11, wMin: 3, wMax: 4.6 },
  { r: 42, count: 44, hMin: 8, hMax: 14, wMin: 3.4, wMax: 5.4 },
  { r: 49, count: 52, hMin: 10, hMax: 18, wMin: 4, wMax: 6.4 },
];

function buildSkyline(): THREE.Group {
  const root = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofGeo = new THREE.ConeGeometry(0.74, 1, 4); // 4-sided pyramid

  const bodyM: THREE.Matrix4[] = [];
  const bodyC: THREE.Color[] = [];
  const roofM: THREE.Matrix4[] = [];
  const roofC: THREE.Color[] = [];

  const up = new THREE.Vector3(0, 1, 0);
  let idx = 0;
  for (const ring of RINGS) {
    for (let i = 0; i < ring.count; i++) {
      idx++;
      const a = (i / ring.count) * Math.PI * 2 + (rng(idx, 1) - 0.5) * 0.14;
      const rr = ring.r + (rng(idx, 2) - 0.5) * 5.5;
      const w = ring.wMin + rng(idx, 3) * (ring.wMax - ring.wMin);
      const d = ring.wMin + rng(idx, 4) * (ring.wMax - ring.wMin);
      const h = ring.hMin + rng(idx, 5) * (ring.hMax - ring.hMin);
      const x = Math.cos(a) * rr;
      const z = Math.sin(a) * rr;
      const facing = Math.atan2(-x, -z); // turn a face toward the town centre
      const q = new THREE.Quaternion().setFromAxisAngle(up, facing);

      bodyM.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(x, h / 2, z),
          q,
          new THREE.Vector3(w, h, d),
        ),
      );
      bodyC.push(new THREE.Color(FACADES[Math.floor(rng(idx, 6) * FACADES.length)]));

      // A friendly pyramid roof, height clamped so tall buildings don't spike.
      const roofH = Math.min(2.4, Math.max(w, d) * 0.55);
      roofM.push(
        new THREE.Matrix4().compose(
          new THREE.Vector3(x, h + roofH / 2, z),
          q,
          new THREE.Vector3(Math.max(w, d) * 1.04, roofH, Math.max(w, d) * 1.04),
        ),
      );
      roofC.push(new THREE.Color(ROOFS[Math.floor(rng(idx, 7) * ROOFS.length)]));
    }
  }

  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
  const roofMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });

  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, bodyM.length);
  bodyM.forEach((m, i) => {
    bodies.setMatrixAt(i, m);
    bodies.setColorAt(i, bodyC[i]);
  });
  bodies.instanceMatrix.needsUpdate = true;
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  bodies.castShadow = false;
  bodies.receiveShadow = false;
  bodies.frustumCulled = false;

  const roofs = new THREE.InstancedMesh(roofGeo, roofMat, roofM.length);
  roofM.forEach((m, i) => {
    roofs.setMatrixAt(i, m);
    roofs.setColorAt(i, roofC[i]);
  });
  roofs.instanceMatrix.needsUpdate = true;
  if (roofs.instanceColor) roofs.instanceColor.needsUpdate = true;
  roofs.frustumCulled = false;

  root.add(bodies, roofs);
  return root;
}

export function Skyline() {
  const group = useMemo(buildSkyline, []);
  useEffect(
    () => () => {
      group.traverse((o) => {
        const m = o as THREE.InstancedMesh;
        if (m.isInstancedMesh) {
          m.dispose();
          (m.material as THREE.Material).dispose();
        }
      });
      (group.children[0] as THREE.InstancedMesh)?.geometry.dispose();
      (group.children[1] as THREE.InstancedMesh)?.geometry.dispose();
    },
    [group],
  );
  return <primitive object={group} />;
}
