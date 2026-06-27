// ---------------------------------------------------------------------------
// WorldView — a shared little 3D plaza where each kid drives their own VRM
// avatar with WASD / arrow keys and chats with floating bubbles. Presence and
// movement sync in real time over `world/{roomCode}/players` (see worldSync).
//
// LAZY-LOADED from App so the heavy three/three-vrm bundle only loads here.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { resolveAssetUrl } from "../features/avatar/AvatarManifest";
import { useApp } from "../store/AppContext";
import { getKid } from "../store/selectors";
import { currentLoadout } from "../features/avatar/AvatarEconomy";
import { itemById } from "../features/avatar/AvatarManifest";
import { webglAvailable } from "../features/avatar/webgl";
import { loadAvatar, resolveModelUrl, type LoadedAvatar } from "./vrmLoader";
import {
  joinWorld,
  leaveWorld,
  sendChat,
  subscribeWorld,
  updateSelf,
  type PlayerState,
} from "./worldSync";

const BOUND = 8; // play-area half-extent (props ring the outside)
const SPEED = 3.6;

/** Live, mutable pose shared between the controller and the local avatar. */
type Pose = { x: number; z: number; heading: number; moving: boolean };

function keyToDir(k: string): "up" | "down" | "left" | "right" | null {
  switch (k) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up";
    case "ArrowDown":
    case "s":
    case "S":
      return "down";
    case "ArrowLeft":
    case "a":
    case "A":
      return "left";
    case "ArrowRight":
    case "d":
    case "D":
      return "right";
    default:
      return null;
  }
}

/** Deterministic spawn point on a ring so kids don't pile up. */
function spawnFor(kidId: string): { x: number; z: number } {
  let h = 0;
  for (let i = 0; i < kidId.length; i++) h = (h * 31 + kidId.charCodeAt(i)) | 0;
  const a = ((h % 360) * Math.PI) / 180;
  return { x: Math.cos(a) * 1.5, z: Math.sin(a) * 1.5 };
}

const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

// --- CC0 prop loading (trees, houses, rocks…) ----------------------------
// Each GLB is loaded once, normalized so its tallest side = `height` with feet
// on y=0, then cloned cheaply for every placement.
const propCache = new Map<string, Promise<THREE.Object3D>>();
function loadProp(url: string): Promise<THREE.Object3D> {
  let p = propCache.get(url);
  if (!p) {
    p = new GLTFLoader().loadAsync(url).then((g) => {
      const root = g.scene;
      root.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(root);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      root.scale.setScalar(1 / maxDim); // normalize tallest dim to 1 unit
      root.updateWorldMatrix(true, true);
      const b2 = new THREE.Box3().setFromObject(root);
      root.position.x -= (b2.min.x + b2.max.x) / 2;
      root.position.z -= (b2.min.z + b2.max.z) / 2;
      root.position.y -= b2.min.y; // feet on ground
      root.traverse((o) => {
        o.frustumCulled = false;
      });
      // Wrap so PropField's position/scale on the clone don't clobber this
      // normalization (the wrapper is what gets transformed per instance).
      const wrap = new THREE.Group();
      wrap.add(root);
      return wrap;
    });
    propCache.set(url, p);
  }
  return p;
}

/** One CC0 model placed many times. `height` = world height of the tallest
 * dimension; `items` = [x, z, rotationY, scaleMultiplier] per instance. */
function PropField({
  url,
  height,
  items,
}: {
  url: string;
  height: number;
  items: [number, number, number, number][];
}) {
  const [proto, setProto] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    let alive = true;
    loadProp(resolveAssetUrl(url))
      .then((o) => alive && setProto(o))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);
  const clones = useMemo(
    () => (proto ? items.map(() => proto.clone(true)) : []),
    [proto, items],
  );
  if (!proto) return null;
  return (
    <>
      {clones.map((c, i) => (
        <primitive
          key={i}
          object={c}
          position={[items[i][0], 0, items[i][1]]}
          rotation={[0, items[i][2], 0]}
          scale={height * items[i][3]}
        />
      ))}
    </>
  );
}

// Deterministic placement (no Math.random — stable across renders).
function scatter(
  n: number,
  rMin: number,
  rMax: number,
  seed = 1,
): [number, number, number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i * 2654435761 * seed) >>> 0;
    const a = ((t % 1000) / 1000) * Math.PI * 2;
    const r = rMin + (((t >> 10) % 1000) / 1000) * (rMax - rMin);
    const rot = ((t >> 4) % 628) / 100;
    const s = 0.75 + (((t >> 7) % 50) / 100);
    return [Math.cos(a) * r, Math.sin(a) * r, rot, s];
  });
}

// The village green — CC0 low-poly props (Kenney + Quaternius) placed around a
// central plaza. `height` = world size of the model's largest dimension.
type PropDef = { url: string; height: number; items: [number, number, number, number][] };
const WORLD_PROPS: PropDef[] = [
  // Landmarks
  { url: "/assets/world/well.glb", height: 2.2, items: [[0, 9, 0, 1]] },
  { url: "/assets/world/windmill.glb", height: 7.5, items: [[-14, -11, 0.6, 1]] },
  {
    url: "/assets/world/house.glb",
    height: 3,
    items: [
      [12, -3, -2.1, 1],
      [-12, -4, 2.1, 1.05],
      [7, -13, -0.5, 1],
      [-8, -13, 0.5, 0.95],
    ],
  },
  {
    url: "/assets/world/stall.glb",
    height: 2.4,
    items: [
      [5, 4.5, 3.3, 1],
      [-6, 4.5, 2.9, 1],
    ],
  },
  { url: "/assets/world/tent.glb", height: 2, items: [[13, 6, -2.4, 1]] },
  { url: "/assets/world/campfire.glb", height: 0.8, items: [[-3.5, -4, 0, 1]] },
  {
    url: "/assets/world/bench.glb",
    height: 1.4,
    items: [
      [3.4, -1, 0, 1],
      [-3.4, -1, Math.PI, 1],
    ],
  },
  {
    url: "/assets/world/streetlight.glb",
    height: 3.6,
    items: [
      [6, -6, 0, 1],
      [-6, -6, 0, 1],
      [6, 6, 0, 1],
      [-6, 6, 0, 1],
    ],
  },
  { url: "/assets/world/signpost.glb", height: 1.6, items: [[2.6, 6, 0.5, 1]] },
  // Trees + nature — tall things ring the OUTSIDE (radius 9-22) so the central
  // play area stays open; only low ground detail sits close in.
  { url: "/assets/world/pine.glb", height: 4.2, items: scatter(10, 12, 23, 3) },
  { url: "/assets/world/tree.glb", height: 3.2, items: scatter(10, 11, 22, 7) },
  { url: "/assets/world/palm.glb", height: 4.6, items: scatter(3, 14, 22, 11) },
  { url: "/assets/world/bush.glb", height: 1.1, items: scatter(10, 10, 21, 13) },
  { url: "/assets/world/flowerbush.glb", height: 1.3, items: scatter(7, 10, 20, 17) },
  { url: "/assets/world/flowers.glb", height: 0.5, items: scatter(14, 5, 19, 19) },
  { url: "/assets/world/grass.glb", height: 0.7, items: scatter(16, 5, 20, 23) },
  { url: "/assets/world/rock.glb", height: 0.6, items: scatter(8, 6, 19, 29) },
  { url: "/assets/world/rock-large.glb", height: 1.7, items: scatter(3, 11, 18, 31) },
  { url: "/assets/world/mushroom.glb", height: 0.5, items: scatter(6, 6, 17, 37) },
  { url: "/assets/world/log.glb", height: 1.3, items: scatter(3, 10, 17, 41) },
];

// --- Scenery -------------------------------------------------------------
function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 7]} />
        <meshStandardMaterial color="#7a5230" roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 1.3 + i * 0.4, 0]}>
          <icosahedronGeometry args={[0.7 - i * 0.15, 0]} />
          <meshStandardMaterial
            color={["#3f9b4f", "#54b85f", "#6cc96f"][i]}
            roughness={1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function WorldScene() {
  const trees = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r = 18 + ((i * 7) % 5);
        return [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number];
      }),
    [],
  );
  return (
    <>
      <color attach="background" args={["#bfe6ff"]} />
      {/* Fade the wide flat ground into the sky so the town feels nestled. */}
      <fog attach="fog" args={["#bfe6ff", 16, 30]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#9fd6a0", 1.1]} />
      <directionalLight position={[8, 14, 6]} intensity={1.5} color="#fff6e8" />
      <directionalLight position={[-5, 4, -3]} intensity={0.45} color="#bcd9ff" />
      {/* Solid green ground (also used under a preloaded map whose own ground
          we hide). Sits just below y=0 so building bases don't z-fight. */}
      {!WORLD_MAP?.hasGround && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <circleGeometry args={[44, 64]} />
          <meshStandardMaterial color="#83c267" roughness={1} />
        </mesh>
      )}
      {/* Tan plaza disc only for the hand-placed village (not a real map). */}
      {!WORLD_MAP && !SUBURB && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[7, 48]} />
          <meshStandardMaterial color="#d8c79a" roughness={1} />
        </mesh>
      )}
      {!WORLD_MAP &&
        WORLD_PROPS.length === 0 &&
        trees.map((p, i) => <Tree key={i} position={p} />)}
    </>
  );
}

// A single pre-built world map GLB (village/town scene). When set, it replaces
// the hand-placed prop village + procedural ground. scale/y/spawn from the
// asset's integration notes. null → use the WORLD_PROPS village.
type WorldMapDef = {
  url: string;
  scale: number;
  y: number;
  /** Where the avatar should start on this map. */
  spawn: { x: number; z: number };
  /** Half-extent the avatar may roam on this map. */
  bound: number;
  /** Whether this map already provides its own ground (hide ours). */
  hasGround: boolean;
};
// Set the return to a WorldMapDef to load a single pre-built map GLB instead of
// the hand-placed prop village. (A function so TS keeps the union type.)
function getWorldMap(): WorldMapDef | null {
  return null; // (Happy Town map kept in repo; suburb grid is the active world)
}
const WORLD_MAP = getWorldMap();
// Cozy-suburb grid town assembled from the CC0 road kit + house/tree props.
const SUBURB = true;
const ROAM = WORLD_MAP ? WORLD_MAP.bound : SUBURB ? 20 : BOUND;

/** Loads + adds a single pre-built map GLB. */
function PreloadedMap({ map }: { map: WorldMapDef }) {
  const [scene, setScene] = useState<THREE.Object3D | null>(null);
  useEffect(() => {
    let alive = true;
    new GLTFLoader()
      .loadAsync(resolveAssetUrl(map.url))
      .then((g) => {
        if (!alive) return;
        g.scene.updateWorldMatrix(true, true);
        // The widest-footprint mesh is the big ground plane — it's near-white
        // and reads as sky/void, so repaint it flat grass-green (vertex colors
        // off) so the town sits on a green field.
        let ground: THREE.Mesh | null = null;
        let groundArea = 0;
        g.scene.traverse((o) => {
          o.frustumCulled = false;
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const b = new THREE.Box3().setFromObject(m);
          const area = (b.max.x - b.min.x) * (b.max.z - b.min.z);
          if (area > groundArea) {
            groundArea = area;
            ground = m;
          }
        });
        // The map's own ground plane is a near-white disc/ring that reads as
        // void — hide it and let our solid green ground (WorldScene) show under
        // the town instead.
        if (ground) (ground as THREE.Mesh).visible = false;
        setScene(g.scene);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [map.url]);
  if (!scene) return null;
  return (
    <primitive object={scene} scale={map.scale} position={[0, map.y, 0]} />
  );
}

// --- Suburb: a grid town assembled from a CC0 road kit + house/tree props ----
const TILE = 8; // world size of one road tile (≈5 avatar-widths, a 2-lane road)
const GRID = 5; // 5×5 cells → 40×40-unit neighbourhood

/** Normalize a cloned prototype: centered on x/z, base on y=0, sized either to a
 * footprint (max of x/z) or a height (y). Returns a wrapper to transform. */
function fit(
  proto: THREE.Object3D | undefined,
  opts: { footprint?: number; height?: number },
): THREE.Object3D | null {
  if (!proto) return null;
  const o = proto.clone(true);
  o.position.set(0, 0, 0);
  o.rotation.set(0, 0, 0);
  o.scale.set(1, 1, 1);
  o.updateWorldMatrix(true, true);
  let b = new THREE.Box3().setFromObject(o);
  const sx = b.max.x - b.min.x;
  const sy = b.max.y - b.min.y || 1;
  const sz = b.max.z - b.min.z;
  const s = opts.height
    ? opts.height / sy
    : (opts.footprint ?? 1) / (Math.max(sx, sz) || 1);
  o.scale.setScalar(s);
  o.updateWorldMatrix(true, true);
  b = new THREE.Box3().setFromObject(o);
  o.position.x -= (b.min.x + b.max.x) / 2;
  o.position.z -= (b.min.z + b.max.z) / 2;
  o.position.y -= b.min.y;
  o.traverse((c) => (c.frustumCulled = false));
  const wrap = new THREE.Group();
  wrap.add(o);
  return wrap;
}

type Placed = {
  obj: THREE.Object3D;
  x: number;
  z: number;
  rot: number;
};

function SuburbTown({ groupRef }: { groupRef: React.RefObject<THREE.Group> }) {
  const [src, setSrc] = useState<{
    road: (n: string) => THREE.Object3D | undefined;
    house: THREE.Object3D;
    tree: THREE.Object3D;
    bench: THREE.Object3D;
    flowers: THREE.Object3D;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    const L = (u: string) => new GLTFLoader().loadAsync(resolveAssetUrl(u));
    Promise.all([
      L("/assets/world/road-kit.glb"),
      L("/assets/world/house-modern.glb"),
      L("/assets/world/tree.glb"),
      L("/assets/world/bench.glb"),
      L("/assets/world/flowers.glb"),
    ])
      .then(([rk, hs, tr, bn, fl]) => {
        if (!alive) return;
        const named = new Map<string, THREE.Object3D>();
        rk.scene.traverse((o) => {
          // Map by NODE name (the tile pieces are named nodes, not meshes).
          if (o.name && !named.has(o.name)) named.set(o.name, o);
        });
        setSrc({
          road: (n) => named.get(n),
          house: hs.scene,
          tree: tr.scene,
          bench: bn.scene,
          flowers: fl.scene,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const placed = useMemo<Placed[]>(() => {
    if (!src) return [];
    const out: Placed[] = [];
    const off = ((GRID - 1) / 2) * TILE; // recenter grid on origin
    const cellX = (c: number) => c * TILE - off;
    const cellZ = (r: number) => r * TILE - off;
    const isRoadC = (c: number) => c === 1 || c === 3;
    const isRoadR = (r: number) => r === 1 || r === 3;

    for (let c = 0; c < GRID; c++) {
      for (let r = 0; r < GRID; r++) {
        const x = cellX(c);
        const z = cellZ(r);
        if (isRoadC(c) && isRoadR(r)) {
          const t = fit(src.road("road_crossroad"), { footprint: TILE });
          if (t) out.push({ obj: t, x, z, rot: 0 });
        } else if (isRoadC(c) || isRoadR(r)) {
          const t = fit(src.road("road_square"), { footprint: TILE });
          if (t) out.push({ obj: t, x, z, rot: isRoadR(r) ? Math.PI / 2 : 0 });
        } else {
          // Building lot: green lawn (the ground shows through) + a house facing
          // the town centre, a tree, and a flower bed.
          const h = fit(src.house, { height: 5 });
          if (h)
            out.push({
              obj: h,
              x,
              z,
              rot: Math.atan2(-x, -z), // face origin/town centre
            });
          const tr2 = fit(src.tree, { height: 4.5 });
          if (tr2)
            out.push({ obj: tr2, x: x + 2.6, z: z + 2.6, rot: 0 });
          const fl = fit(src.flowers, { height: 0.6 });
          if (fl) out.push({ obj: fl, x: x - 2.4, z: z + 2.4, rot: 0 });
        }
      }
    }
    // Lamp posts + benches at the four crossroads' corners.
    for (const [c, r] of [
      [1, 1],
      [3, 1],
      [1, 3],
      [3, 3],
    ]) {
      const x = cellX(c);
      const z = cellZ(r);
      const lamp = fit(src.road("light_square"), { height: 4.5 });
      if (lamp) out.push({ obj: lamp, x: x + 3.6, z: z + 3.6, rot: 0 });
      const bench = fit(src.bench, { footprint: 1.8 });
      if (bench) out.push({ obj: bench, x: x - 3.4, z: z + 3.6, rot: 0 });
    }
    return out;
  }, [src]);

  return (
    <group ref={groupRef}>
      {placed.map((p, i) => (
        <primitive
          key={i}
          object={p.obj}
          position={[p.x, 0, p.z]}
          rotation={[0, p.rot, 0]}
        />
      ))}
    </group>
  );
}

/** The world geometry the camera raycasts against — suburb grid town, a
 * preloaded map GLB, or the hand-placed prop village. */
function VillageProps({
  groupRef,
}: {
  groupRef: React.RefObject<THREE.Group>;
}) {
  if (SUBURB) return <SuburbTown groupRef={groupRef} />;
  return (
    <group ref={groupRef}>
      {WORLD_MAP ? (
        <PreloadedMap map={WORLD_MAP} />
      ) : (
        WORLD_PROPS.map((p, i) => (
          <PropField key={i} url={p.url} height={p.height} items={p.items} />
        ))
      )}
    </group>
  );
}

// --- One avatar (local or remote) ---------------------------------------
function WorldAvatar({
  url,
  getPose,
  name,
  color,
  chat,
}: {
  url: string;
  getPose: () => Pose;
  name: string;
  color: string;
  chat?: { text: string; ts: number } | null;
}) {
  const group = useRef<THREE.Group>(null);
  const [loaded, setLoaded] = useState<LoadedAvatar | null>(null);
  const bob = useRef(0);

  useEffect(() => {
    let alive = true;
    let inst: LoadedAvatar | null = null;
    loadAvatar(url)
      .then((a) => {
        if (!alive) {
          a.dispose();
          return;
        }
        inst = a;
        setLoaded(a);
      })
      .catch(() => {});
    return () => {
      alive = false;
      inst?.dispose();
    };
  }, [url]);

  // Chat bubble auto-hides ~6s after the message.
  const [bubble, setBubble] = useState<string | null>(null);
  useEffect(() => {
    if (!chat) return;
    setBubble(chat.text);
    const id = window.setTimeout(() => setBubble(null), 6000);
    return () => window.clearTimeout(id);
  }, [chat?.ts, chat?.text]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const p = getPose();
    const k = Math.min(1, dt * 12);
    g.position.x += (p.x - g.position.x) * k;
    g.position.z += (p.z - g.position.z) * k;
    let dh = p.heading - g.rotation.y;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    g.rotation.y += dh * k;
    if (p.moving) {
      bob.current += dt * 9;
      g.position.y = Math.abs(Math.sin(bob.current)) * 0.05;
    } else {
      g.position.y += (0 - g.position.y) * Math.min(1, dt * 8);
    }
    loaded?.update(dt, p.moving);
  });

  return (
    <group ref={group}>
      {loaded && <primitive object={loaded.object} />}
      {/* simple blob shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
      <Html position={[0, 2.05, 0]} center distanceFactor={9} occlude={false}>
        <div className="wtag" style={{ borderColor: color }}>
          {name}
        </div>
        {bubble && <div className="wbubble">{bubble}</div>}
      </Html>
    </group>
  );
}

// --- Camera + local input -----------------------------------------------
function Rig({
  self,
  propsRef,
}: {
  self: React.MutableRefObject<Pose>;
  propsRef: React.RefObject<THREE.Group>;
}) {
  const keys = useRef<Set<string>>(new Set());
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const { camera } = useThree();
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const move = useMemo(() => new THREE.Vector3(), []);
  const tgt = useMemo(() => new THREE.Vector3(), []);
  const dirv = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new THREE.Raycaster(), []);
  const inited = useRef(false);
  const dragging = useRef(false);
  const wired = useRef(false);

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const d = keyToDir(e.key);
      if (d) {
        keys.current.add(d);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const d = keyToDir(e.key);
      if (d) keys.current.delete(d);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    const s = self.current;
    // Movement is CAMERA-RELATIVE (MMORPG style): forward = away from camera.
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    // right = forward rotated -90° about Y
    const rx = -fwd.z;
    const rz = fwd.x;
    move.set(0, 0, 0);
    if (keys.current.has("up")) move.add(fwd);
    if (keys.current.has("down")) move.sub(fwd);
    if (keys.current.has("right")) move.add(new THREE.Vector3(rx, 0, rz));
    if (keys.current.has("left")) move.add(new THREE.Vector3(-rx, 0, -rz));
    const moving = move.lengthSq() > 1e-6;
    if (moving) {
      move.normalize();
      s.x = clamp(s.x + move.x * SPEED * dt, -ROAM, ROAM);
      s.z = clamp(s.z + move.z * SPEED * dt, -ROAM, ROAM);
      // Face the way we move (VRM forward is +Z in this pipeline).
      s.heading = Math.atan2(move.x, move.z);
      updateSelf({ x: s.x, z: s.z, heading: s.heading, moving: true });
    } else if (s.moving) {
      updateSelf({ x: s.x, z: s.z, heading: s.heading, moving: false }, true);
    }
    s.moving = moving;

    // Orbit camera follows the character: keep the orbit target on them, so the
    // user's drag-to-rotate + scroll-to-zoom stay relative to the avatar.
    const c = controls.current;
    if (c) {
      // Track manual drag so the chase-cam pauses while the player free-looks.
      if (!wired.current) {
        wired.current = true;
        c.addEventListener("start", () => (dragging.current = true));
        c.addEventListener("end", () => (dragging.current = false));
      }
      tgt.set(s.x, 1.2, s.z);
      if (!inited.current) {
        // Establish a nice third-person orbit distance once, BEHIND the avatar's
        // facing so it looks where the avatar looks (and forward walks ahead).
        inited.current = true;
        c.target.copy(tgt);
        const back = 5;
        camera.position.set(
          s.x - Math.sin(s.heading) * back,
          tgt.y + 10, // higher = looks down over the trees
          s.z - Math.cos(s.heading) * back,
        );
      } else {
        c.target.lerp(tgt, Math.min(1, dt * 10));
      }
      // Chase-cam: while moving (and not free-looking) ease the camera around
      // to sit BEHIND the avatar, so it follows from behind like an MMORPG.
      if (moving && !dragging.current) {
        const cur = c.getAzimuthalAngle();
        let d = s.heading + Math.PI - cur;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        c.setAzimuthalAngle(cur + d * Math.min(1, dt * 1.4));
      }
      c.update();

      // Camera collision: if a prop sits between the avatar and the camera,
      // pull the camera in to that point so the view is never blocked.
      if (propsRef.current) {
        dirv.copy(camera.position).sub(c.target);
        const dist = dirv.length();
        if (dist > 0.01) {
          dirv.normalize();
          ray.set(c.target, dirv);
          ray.far = dist;
          const hits = ray.intersectObject(propsRef.current, true);
          if (hits.length && hits[0].distance < dist - 0.1) {
            camera.position
              .copy(c.target)
              .addScaledVector(dirv, Math.max(4, hits[0].distance - 0.4));
          }
        }
      }
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      rotateSpeed={0.9}
      zoomSpeed={1.1}
      minDistance={5}
      maxDistance={20}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2.7}
    />
  );
}

// --- Main view -----------------------------------------------------------
export default function WorldView() {
  const { state } = useApp();
  const kidId = state.activeKid;
  const kid = getKid(state, kidId);
  const loadout = currentLoadout(state, kidId);
  const canWebgl = useMemo(() => webglAvailable(), []);

  const self = useRef<Pose>(
    (() => {
      const sp = WORLD_MAP
        ? WORLD_MAP.spawn
        : SUBURB
          ? { x: 0, z: 8 } // on the south street, looking up the block
          : spawnFor(kidId);
      // On a map/suburb, start facing the town centre (≈ origin).
      const heading = WORLD_MAP || SUBURB ? Math.atan2(-sp.x, -sp.z) : 0;
      return { ...sp, heading, moving: false };
    })(),
  );
  const propsRef = useRef<THREE.Group>(null);
  const [selfUrl, setSelfUrl] = useState<string | null | undefined>(undefined);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [chatText, setChatText] = useState("");
  // Local chat shows instantly (no Firebase round-trip / stale-filter delay).
  const [myChat, setMyChat] = useState<{ text: string; ts: number } | null>(
    null,
  );

  // Resolve this kid's model, then announce presence.
  useEffect(() => {
    if (!kid || !canWebgl) return;
    let alive = true;
    const outfit = itemById(loadout.outfit)?.value;
    const baseAsset = itemById(loadout.base)?.assetPath;
    resolveModelUrl(kidId, outfit, baseAsset).then((url) => {
      if (!alive) return;
      setSelfUrl(url);
      if (url) {
        const sp = self.current;
        joinWorld({
          kidId,
          name: kid.firstName || kid.name,
          color: kid.color || "#6a5cff",
          modelUrl: url,
          x: sp.x,
          z: sp.z,
          heading: 0,
        });
      }
    });
    return () => {
      alive = false;
      leaveWorld();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId, canWebgl]);

  // Subscribe to everyone in the room.
  useEffect(() => subscribeWorld(setPlayers), []);

  // Heartbeat: refresh our timestamp so we don't get stale-filtered while idle.
  useEffect(() => {
    const id = window.setInterval(() => updateSelf({}, true), 4000);
    return () => window.clearInterval(id);
  }, []);

  const send = () => {
    const t = chatText.trim();
    if (t) {
      sendChat(t);
      setMyChat({ text: t, ts: Date.now() });
      setChatText("");
    }
  };

  if (!canWebgl)
    return (
      <div className="world world--msg">
        This device can&apos;t show the 3D World (no WebGL).
      </div>
    );
  if (selfUrl === null)
    return (
      <div className="world world--msg">
        🌍 Pick a character on the <strong>Avatar</strong> tab first — then come
        play in the World!
      </div>
    );

  const selfChat = players.find((p) => p.kidId === kidId)?.chat ?? null;
  const others = players.filter((p) => p.kidId !== kidId && p.modelUrl);

  return (
    <div className="world">
      <Canvas
        shadows={false}
        dpr={[1, 1.6]}
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        camera={{ position: [0, 9.5, 5.5], fov: 45 }}
      >
        <WorldScene />
        <VillageProps groupRef={propsRef} />
        <Rig self={self} propsRef={propsRef} />
        {selfUrl && (
          <WorldAvatar
            url={selfUrl}
            getPose={() => self.current}
            name={(kid?.firstName || kid?.name || "Me") + " (you)"}
            color={kid?.color || "#6a5cff"}
            chat={myChat ?? selfChat}
          />
        )}
        {others.map((p) => (
          <WorldAvatar
            key={p.kidId}
            url={p.modelUrl}
            getPose={() => ({
              x: p.x,
              z: p.z,
              heading: p.heading,
              moving: !!p.moving,
            })}
            name={p.name}
            color={p.color}
            chat={p.chat}
          />
        ))}
      </Canvas>

      <div className="world__hud">
        <div className="world__hint">
          <strong>Move</strong> WASD/arrows · <strong>drag</strong> to look ·{" "}
          <strong>scroll</strong> to zoom · {players.length} here
        </div>
        {WORLD_MAP && (
          <div className="world__credit">
            Map: “Happy Town” by Alex Safayan &amp; Alex Pasquarella · CC-BY
          </div>
        )}
        <div className="world__chat">
          <input
            className="world__chatinput"
            placeholder="Say something…"
            value={chatText}
            maxLength={120}
            onChange={(e) => setChatText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <button className="world__send" onClick={send}>
            Say 💬
          </button>
        </div>
      </div>
    </div>
  );
}
