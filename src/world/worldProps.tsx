// ---------------------------------------------------------------------------
// worldProps — shared building blocks for the outer districts (the big-map
// expansion). One place to drop a GLB into the scene, scatter many of them
// cheaply, or lay down a patch of themed ground / a connecting road.
//
// GLB loading mirrors the codebase's convention (raw GLTFLoader + a module
// prototype cache, cloned per instance). Clones share the cached prototype's
// geometry/materials, so — like PropField — we deliberately do NOT dispose
// clones (that would corrupt the shared cache); prototypes live for the app's
// lifetime, which is fine for a world that mounts once per session.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { resolveAssetUrl } from "../features/avatar/AvatarManifest";

type Vec3 = readonly [number, number, number];

const protoCache = new Map<string, Promise<THREE.Object3D>>();

function loadPrototype(url: string): Promise<THREE.Object3D> {
  let p = protoCache.get(url);
  if (!p) {
    p = new GLTFLoader().loadAsync(resolveAssetUrl(url)).then((gltf) => {
      const obj = gltf.scene;
      obj.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      return obj;
    });
    protoCache.set(url, p);
  }
  return p;
}

/** Clone + normalize a loaded prototype: tallest dim → `height` units (if given),
 *  feet dropped to y=0 so it sits on the ground. */
function prepareClone(proto: THREE.Object3D, height?: number): THREE.Object3D {
  const obj = proto.clone(true);
  if (height && height > 0) {
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    const h = Math.max(0.001, box.max.y - box.min.y);
    obj.scale.setScalar(height / h);
  }
  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(obj);
  obj.position.y = -box.min.y;
  return obj;
}

/**
 * Place one GLB. `height` normalizes the model's tallest dimension to that many
 * world units (feet at ground level); omit it to keep the model's own scale and
 * apply `scale` instead.
 */
export function Prop({
  url,
  position = [0, 0, 0],
  rotationY = 0,
  height,
  scale = 1,
}: {
  url: string;
  position?: Vec3;
  rotationY?: number;
  height?: number;
  scale?: number;
}) {
  const [obj, setObj] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    let alive = true;
    loadPrototype(url).then((proto) => {
      if (alive) setObj(prepareClone(proto, height));
    });
    return () => {
      alive = false;
    };
  }, [url, height]);
  if (!obj) return null;
  return (
    <group position={position as unknown as THREE.Vector3Tuple} rotation={[0, rotationY, 0]} scale={scale}>
      <primitive object={obj} />
    </group>
  );
}

export type Placement = {
  x: number;
  z: number;
  rotationY?: number;
  scale?: number;
  height?: number;
};

/**
 * Many copies of one GLB from a placement list. Uses <Prop> clones — keep counts
 * modest per district (the world's quality tiers still gate particles/shadows).
 */
export function Scatter({
  url,
  items,
  height,
}: {
  url: string;
  items: Placement[];
  height?: number;
}) {
  return (
    <>
      {items.map((p, i) => (
        <Prop
          key={i}
          url={url}
          position={[p.x, 0, p.z]}
          rotationY={p.rotationY ?? 0}
          scale={p.scale ?? 1}
          height={p.height ?? height}
        />
      ))}
    </>
  );
}

/** A flat themed ground patch (grass, sand, plaza…) laid just above the base
 *  ground. Round by default; pass `w`/`d` for a rectangle (e.g. a road). */
export function GroundPatch({
  x,
  z,
  r,
  w,
  d,
  y = 0.006,
  rotationY = 0,
  color,
}: {
  x: number;
  z: number;
  r?: number;
  w?: number;
  d?: number;
  y?: number;
  rotationY?: number;
  color: string;
}) {
  return (
    <mesh
      position={[x, y, z]}
      rotation={[-Math.PI / 2, 0, rotationY]}
      receiveShadow
    >
      {r != null ? (
        <circleGeometry args={[r, 48]} />
      ) : (
        <planeGeometry args={[w ?? 4, d ?? 4]} />
      )}
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

/** A straight road/path slab from (x1,z1) to (x2,z2) of a given width. */
export function Road({
  from,
  to,
  width = 4,
  color = "#e4d3ad",
  y = 0.008,
}: {
  from: readonly [number, number];
  to: readonly [number, number];
  width?: number;
  color?: string;
  y?: number;
}) {
  const { mid, len, rot } = useMemo(() => {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    return {
      mid: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2] as const,
      len: Math.hypot(dx, dz),
      rot: -Math.atan2(dz, dx),
    };
  }, [from, to]);
  return (
    <mesh position={[mid[0], y, mid[1]]} rotation={[-Math.PI / 2, 0, rot]} receiveShadow>
      <planeGeometry args={[len, width]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}
