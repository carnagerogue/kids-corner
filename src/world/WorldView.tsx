// ---------------------------------------------------------------------------
// WorldView — a shared little 3D plaza where each kid drives their own VRM
// avatar with WASD / arrow keys and chats with floating bubbles. Presence and
// movement sync in real time over `world/{roomCode}/players` (see worldSync).
//
// LAZY-LOADED from App so the heavy three/three-vrm bundle only loads here.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  shareActivatedLandmark,
  shareCollectedStar,
  sendChat,
  subscribeWorldGame,
  subscribeWorld,
  updateSelf,
  worldRoomCode,
  worldSyncEnabled,
  type PlayerState,
} from "./worldSync";
import {
  activateLandmarks,
  collectStar,
  completeStarQuest,
  currentSeasonalEvent,
  interactionsFor,
  LANDMARKS,
  loadWorldSave,
  mergeCollectedStars,
  saveWorldSave,
  selectDecoration,
  startStarQuest,
  type DecorationId,
  type InteractionTarget,
  type LandmarkId,
  type WorldSave,
} from "./worldGame";
import {
  AmbientLife,
  CelebrationBurst,
  ChampionsRing,
  LivingSky,
  MayorNova,
  QuestCollectibles,
  WorldCreatures,
  WorldLandmarks,
} from "./WorldContent";
import {
  ACADEMY_QUESTS,
  academyById,
  befriend,
  befriendedCount,
  chaptersDone,
  claimDaily,
  completeChapter,
  currentChapterIndex,
  currentStreak,
  dailyClaimable,
  dailyView,
  equipAura,
  equipCompanion,
  isBefriended,
  levelBar,
  levelForXp,
  levelTitle,
  loadAcademy,
  ownAura,
  questStatus,
  recordBossWin,
  recordCorrect,
  recordDailyEvent,
  saveAcademy,
  todayStr,
  type AcademyChapter,
  type AcademyProgress,
  type AcademyQuestId,
  type AcademyQuestion,
} from "./academyQuests";
import { AcademyChallenge } from "./AcademyChallenge";
import { BattleArena } from "./BattleArena";
import { BossArena } from "./BossArena";
import { WorldShop } from "./WorldShop";
import {
  CHAMPIONS_RING,
  CREATURES,
  creatureById,
  creatureInteractions,
  creatureUnlocked,
  drawBattleQuestions,
  type Creature,
} from "./worldBattles";
import { disposeObject3D } from "./disposeObject";
import { auraById, type Aura } from "./shopItems";
import { surfaceAt, WorldAudioEngine } from "./worldAudio";
import {
  loadQualityChoice,
  resolveQuality,
  saveQualityChoice,
  type QualityChoice,
} from "./worldQuality";
import { followOrbitTarget } from "./cameraFollow";
import {
  CityBuildings,
  cityBuildingEntry,
  cityDoorInteractions,
  resolveCityBuildingCollisions,
} from "./CityBuildings";
import { SYNC_EVENT } from "../sync";

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

function developmentCitySpawn() {
  if (!import.meta.env.DEV) return null;
  const buildingId = new URLSearchParams(window.location.search).get("cityDoor");
  return buildingId ? cityBuildingEntry(buildingId) : null;
}

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
const ROAM = WORLD_MAP ? WORLD_MAP.bound : SUBURB ? 27 : BOUND;

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
const GRID = 7; // 7×7 cells → 56×56-unit neighbourhood

const LANDMARK_COLLIDERS = [
  { x: -8, z: -8, r: 2.15 },
  { x: 8, z: -8, r: 2.15 },
  { x: 8, z: 8, r: 2.05 },
];

function pushOutsideCollider(pose: Pose, col: { x: number; z: number; r: number }) {
  const ddx = pose.x - col.x;
  const ddz = pose.z - col.z;
  const distance = Math.hypot(ddx, ddz);
  if (distance < col.r && distance > 1e-4) {
    pose.x = col.x + (ddx / distance) * col.r;
    pose.z = col.z + (ddz / distance) * col.r;
  }
}

/** Normalize a cloned prototype: centered on x/z, base on y=0, sized either to a
 * footprint (max of x/z) or a height (y). Returns a wrapper to transform. */
function fit(
  proto: THREE.Object3D | undefined,
  opts: { footprint?: number; height?: number; flat?: boolean },
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
  if (opts.flat) {
    // Road tiles: stretch to the footprint on X/Z but keep their NATIVE thinness
    // on Y so they lie flush with the ground (no thick raised/sunken slab).
    const sxz = (opts.footprint ?? 1) / (Math.max(sx, sz) || 1);
    o.scale.set(sxz, 1, sxz);
  } else {
    const s = opts.height
      ? opts.height / sy
      : (opts.footprint ?? 1) / (Math.max(sx, sz) || 1);
    o.scale.setScalar(s);
  }
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
  y?: number;
};

/** Flatten repeated GLTF clones into InstancedMeshes grouped by shared
 * geometry/material. This keeps the suburb's draw-call count proportional to
 * asset variety instead of the number of road tiles and props. */
function buildInstancedTown(placed: Placed[], shadows: boolean): THREE.Group {
  type Bucket = {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    matrices: THREE.Matrix4[];
  };
  const buckets = new Map<string, Bucket>();
  const root = new THREE.Group();
  const placement = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);

  for (const p of placed) {
    p.obj.updateWorldMatrix(true, true);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.rot);
    placement.compose(new THREE.Vector3(p.x, p.y ?? 0, p.z), q, scale);
    p.obj.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const key = `${mesh.geometry.uuid}:${mesh.material.uuid}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          geometry: mesh.geometry,
          material: mesh.material,
          matrices: [],
        };
        buckets.set(key, bucket);
      }
      bucket.matrices.push(placement.clone().multiply(mesh.matrixWorld));
    });
  }

  for (const bucket of buckets.values()) {
    const instanced = new THREE.InstancedMesh(
      bucket.geometry,
      bucket.material,
      bucket.matrices.length,
    );
    bucket.matrices.forEach((matrix, index) => instanced.setMatrixAt(index, matrix));
    instanced.instanceMatrix.needsUpdate = true;
    instanced.castShadow = shadows;
    instanced.receiveShadow = true;
    instanced.frustumCulled = true;
    instanced.computeBoundingSphere();
    root.add(instanced);
  }
  return root;
}

function SuburbTown({
  groupRef,
  shadows,
  openDoors,
}: {
  groupRef: React.RefObject<THREE.Group>;
  shadows: boolean;
  openDoors: ReadonlySet<string>;
}) {
  const [src, setSrc] = useState<{
    road: (n: string) => THREE.Object3D | undefined;
    bench: THREE.Object3D;
  } | null>(null);

  useEffect(() => {
    let alive = true;
    let loaded: THREE.Object3D[] = [];
    const L = (u: string) => new GLTFLoader().loadAsync(resolveAssetUrl(u));
    Promise.all([
      L("/assets/world/road-kit.glb"),
      L("/assets/world/bench.glb"),
    ])
      .then(([rk, bn]) => {
        loaded = [rk.scene, bn.scene];
        if (!alive) {
          loaded.forEach(disposeObject3D);
          return;
        }
        const named = new Map<string, THREE.Object3D>();
        rk.scene.traverse((o) => {
          // Map by NODE name (the tile pieces are named nodes, not meshes).
          if (o.name && !named.has(o.name)) named.set(o.name, o);
        });
        setSrc({
          road: (n) => named.get(n),
          bench: bn.scene,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
      // Free the source GLB geometry/materials/textures (shared by the instanced
      // clones) so the suburb doesn't leak GPU memory on every Canvas remount.
      loaded.forEach(disposeObject3D);
    };
  }, []);

  const placed = useMemo<Placed[]>(() => {
    if (!src) return [];
    const out: Placed[] = [];
    const off = ((GRID - 1) / 2) * TILE; // recenter grid on origin
    const cellX = (c: number) => c * TILE - off;
    const cellZ = (r: number) => r * TILE - off;
    const isRoad = (i: number) => i % 2 === 1; // streets on odd rows/cols
    const reservedLots = new Set(["-8,-8", "8,-8", "8,8", "-8,8"]);

    for (let c = 0; c < GRID; c++) {
      for (let r = 0; r < GRID; r++) {
        const x = cellX(c);
        const z = cellZ(r);
        const roadC = isRoad(c);
        const roadR = isRoad(r);
        if (roadC && roadR) {
          // Lined 4-way intersection.
          const t = fit(src.road("road_crossroadLine"), {
            footprint: TILE,
            flat: true,
          });
          if (t) out.push({ obj: t, x, z, rot: 0 });
        } else if (roadC || roadR) {
          // Straight road with painted lane lines.
          const t = fit(src.road("road_square"), { footprint: TILE, flat: true });
          if (t) out.push({ obj: t, x, z, rot: roadR ? Math.PI / 2 : 0 });
        } else {
          // Four lots are gameplay spaces: three landmarks and the kid's yard.
          if (reservedLots.has(`${x},${z}`)) continue;
          // Enterable buildings are rendered separately so their doors and
          // cutaway roofs can animate. Keep this pass for roads/street props.
        }
      }
    }
    // Lamp posts + benches along the streets: one at a corner of every
    // intersection cell.
    for (let c = 0; c < GRID; c++) {
      for (let r = 0; r < GRID; r++) {
        if (!(isRoad(c) && isRoad(r))) continue;
        const x = cellX(c);
        const z = cellZ(r);
        const lamp = fit(src.road("light_square"), { height: 4.6 });
        if (lamp)
          out.push({ obj: lamp, x: x + 3.7, z: z + 3.7, rot: Math.PI });
        if ((c + r) % 4 === 0) {
          const bench = fit(src.bench, { footprint: 1.9 });
          if (bench) out.push({ obj: bench, x: x - 3.6, z: z + 3.7, rot: 0 });
        }
      }
    }
    return out;
  }, [src]);

  const instancedTown = useMemo(
    () => buildInstancedTown(placed, shadows),
    [placed, shadows],
  );

  // Dispose the InstancedMeshes' per-instance GPU buffers when the town is
  // rebuilt (quality change) or unmounted. <primitive> never disposes them.
  useEffect(
    () => () => {
      instancedTown.traverse((o) => {
        const mesh = o as THREE.InstancedMesh;
        if (mesh.isInstancedMesh) mesh.dispose();
      });
    },
    [instancedTown],
  );

  return (
    <group ref={groupRef}>
      <primitive object={instancedTown} />
      <CityBuildings openDoors={openDoors} shadows={shadows} />
    </group>
  );
}

/** The world geometry the camera raycasts against — suburb grid town, a
 * preloaded map GLB, or the hand-placed prop village. */
function VillageProps({
  groupRef,
  shadows,
  openDoors,
}: {
  groupRef: React.RefObject<THREE.Group>;
  shadows: boolean;
  openDoors: ReadonlySet<string>;
}) {
  if (SUBURB)
    return <SuburbTown groupRef={groupRef} shadows={shadows} openDoors={openDoors} />;
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

// --- Cosmetic aura (a glowing ground ring + floating motes) --------------
function AvatarAura({ aura }: { aura: Aura }) {
  const ring = useRef<THREE.Mesh>(null);
  const motes = useRef<THREE.Group>(null);
  const dots = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return [Math.cos(a) * 0.62, 0.25 + (i % 3) * 0.55, Math.sin(a) * 0.62] as [
          number,
          number,
          number,
        ];
      }),
    [],
  );
  useFrame((_, dt) => {
    if (ring.current) ring.current.rotation.z += dt * 0.8;
    if (motes.current) motes.current.rotation.y += dt * 1.3;
  });
  return (
    <group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.5, 0.74, 40]} />
        <meshBasicMaterial color={aura.color} transparent opacity={0.6} toneMapped={false} />
      </mesh>
      <group ref={motes}>
        {dots.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshBasicMaterial color={aura.color} transparent opacity={0.85} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// --- Equipped companion (a befriended creature floating at your shoulder) -
function Companion({ creature }: { creature: Creature }) {
  const gem = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    if (gem.current) {
      gem.current.position.y = 1.3 + Math.sin(clock.elapsedTime * 2) * 0.12;
      gem.current.rotation.y += dt * 1.3;
    }
  });
  return (
    <group position={[0.85, 0, -0.15]}>
      <group ref={gem}>
        <mesh castShadow>
          <icosahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial
            color={creature.color}
            emissive={creature.color}
            emissiveIntensity={0.5}
            roughness={0.35}
          />
        </mesh>
      </group>
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
  shadows,
  aura,
  companion,
}: {
  url: string;
  getPose: () => Pose;
  name: string;
  color: string;
  chat?: { text: string; ts: number } | null;
  shadows: boolean;
  aura?: Aura | null;
  companion?: Creature | null;
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
        a.object.traverse((node) => {
          const mesh = node as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.castShadow = shadows;
            mesh.receiveShadow = shadows;
          }
        });
        setLoaded(a);
      })
      .catch(() => {});
    return () => {
      alive = false;
      inst?.dispose();
    };
  }, [url, shadows]);

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
      {aura && <AvatarAura aura={aura} />}
      {companion && <Companion creature={companion} />}
      {/* simple blob shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.18} />
      </mesh>
      <Html position={[0, 2.05, 0]} center distanceFactor={9} occlude={false} zIndexRange={[12, 0]}>
        <div className="wtag" style={{ borderColor: color }}>
          {name}
        </div>
        {bubble && <div className="wbubble">{bubble}</div>}
      </Html>
    </group>
  );
}

// --- Camera + local input -----------------------------------------------
type TouchInput = { x: number; y: number };

function Rig({
  self,
  propsRef,
  touch,
  interactions,
  openDoors,
  onNear,
  audio,
  daylight,
  inputLock,
}: {
  self: React.MutableRefObject<Pose>;
  propsRef: React.RefObject<THREE.Group>;
  touch: React.MutableRefObject<TouchInput>;
  interactions: InteractionTarget[];
  openDoors: ReadonlySet<string>;
  onNear: (target: InteractionTarget | null) => void;
  audio: WorldAudioEngine;
  inputLock: React.MutableRefObject<boolean>;
  daylight: React.MutableRefObject<number>;
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
  const lastNearId = useRef<string | null>(null);
  const stepDistance = useRef(0);
  const audioTick = useRef(0);
  const desiredCameraDistance = useRef(Math.hypot(8.5, 6));
  const cameraColliding = useRef(false);

  useEffect(() => {
    const isTyping = () => {
      const el = document.activeElement;
      return (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT")
      );
    };
    const down = (e: KeyboardEvent) => {
      if (inputLock.current || isTyping()) return;
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
    // Drop every held key when the window loses focus or is hidden — otherwise a
    // key held during alt-tab never gets its keyup and the avatar walks forever.
    const release = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [inputLock]);

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
    // Suppress avatar movement while a lesson/dialogue panel is open so reading
    // or answering never walks the character around behind the panel.
    if (!inputLock.current) {
      if (keys.current.has("up")) move.add(fwd);
      if (keys.current.has("down")) move.sub(fwd);
      if (keys.current.has("right")) {
        move.x += rx;
        move.z += rz;
      }
      if (keys.current.has("left")) {
        move.x -= rx;
        move.z -= rz;
      }
      if (Math.abs(touch.current.y) > 0.03) move.addScaledVector(fwd, touch.current.y);
      if (Math.abs(touch.current.x) > 0.03) {
        move.x += rx * touch.current.x;
        move.z += rz * touch.current.x;
      }
    }
    const moving = move.lengthSq() > 1e-6;
    if (moving) {
      move.normalize();
      s.x = clamp(s.x + move.x * SPEED * dt, -ROAM, ROAM);
      s.z = clamp(s.z + move.z * SPEED * dt, -ROAM, ROAM);
      // Wall collision: if the step would enter a building, push back to its
      // edge (slides along the wall instead of passing through).
      for (const col of LANDMARK_COLLIDERS) pushOutsideCollider(s, col);
      resolveCityBuildingCollisions(s, openDoors);
      // Re-clamp AFTER collision resolution so a perimeter building can't push
      // the avatar back outside the ±ROAM world bound.
      s.x = clamp(s.x, -ROAM, ROAM);
      s.z = clamp(s.z, -ROAM, ROAM);
      // Face the way we move (VRM forward is +Z in this pipeline).
      s.heading = Math.atan2(move.x, move.z);
      updateSelf({ x: s.x, z: s.z, heading: s.heading, moving: true });
      stepDistance.current += SPEED * dt;
      if (stepDistance.current > 0.72) {
        stepDistance.current = 0;
        audio.step(surfaceAt(s.x, s.z));
      }
    } else if (s.moving) {
      updateSelf({ x: s.x, z: s.z, heading: s.heading, moving: false }, true);
    }
    s.moving = moving;
    audioTick.current += dt;
    if (audioTick.current >= 0.12) {
      audioTick.current = 0;
      audio.updatePosition(s.x, s.z, daylight.current);
    }

    let nearest: InteractionTarget | null = null;
    let nearestDistance = Infinity;
    for (const target of interactions) {
      const distance = Math.hypot(s.x - target.position[0], s.z - target.position[2]);
      if (distance <= target.radius && distance < nearestDistance) {
        nearest = target;
        nearestDistance = distance;
      }
    }
    const nextNearId = nearest
      ? `${nearest.kind}:${nearest.id}:${nearest.label}`
      : null;
    if (nextNearId !== lastNearId.current) {
      lastNearId.current = nextNearId;
      onNear(nearest);
    }

    // Orbit camera follows the character: keep the orbit target on them, so the
    // user's drag-to-rotate + scroll-to-zoom stay relative to the avatar.
    const c = controls.current;
    if (c) {
      // Track manual drag so the chase-cam pauses while the player free-looks.
      if (!wired.current) {
        wired.current = true;
        c.addEventListener("start", () => (dragging.current = true));
        c.addEventListener("end", () => {
          dragging.current = false;
          // Keep the player's chosen zoom distance. Do not accidentally save a
          // shortened distance while camera collision is pulling the view in.
          if (!cameraColliding.current) {
            desiredCameraDistance.current = clamp(
              camera.position.distanceTo(c.target),
              5,
              22,
            );
          }
        });
      }
      tgt.set(s.x, 1.2, s.z);
      if (!inited.current) {
        // Establish a nice third-person orbit distance once, BEHIND the avatar's
        // facing so it looks where the avatar looks (and forward walks ahead).
        inited.current = true;
        c.target.copy(tgt);
        const back = 8.5;
        camera.position.set(
          s.x - Math.sin(s.heading) * back,
          tgt.y + 6, // street-level third-person so you see building facades
          s.z - Math.cos(s.heading) * back,
        );
      } else {
        // OrbitControls does not translate the camera when its target moves.
        // Move both by the same smoothed delta so the avatar stays framed while
        // retaining the player's orbit angle and zoom distance.
        followOrbitTarget(
          camera.position,
          c.target,
          tgt,
          Math.min(1, dt * 10),
        );
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

      // Camera collision: pull in immediately when scenery blocks the view,
      // then ease back to the player's chosen zoom distance once it clears.
      if (propsRef.current) {
        dirv.copy(camera.position).sub(c.target);
        const dist = dirv.length();
        const wanted = desiredCameraDistance.current;
        // The raycast is a recursive test against the WHOLE town subtree, so skip
        // it when the player is idle, not free-looking, not currently de-occluding,
        // and already at the chosen distance — i.e. nothing can have changed.
        const needsCheck =
          moving ||
          dragging.current ||
          cameraColliding.current ||
          Math.abs(dist - wanted) > 0.05;
        if (dist > 0.01 && needsCheck) {
          dirv.normalize();
          ray.set(c.target, dirv);
          ray.far = wanted;
          const hits = ray.intersectObject(propsRef.current, true);
          // Floor low enough to actually tuck in front of a near wall (a 4-unit
          // floor could sit farther out than the obstruction it should dodge).
          const allowed = hits.length
            ? Math.max(1.5, hits[0].distance - 0.4)
            : wanted;
          cameraColliding.current = allowed < wanted - 0.1;
          const nextDistance = cameraColliding.current
            ? Math.min(dist, allowed)
            : THREE.MathUtils.lerp(dist, wanted, Math.min(1, dt * 5));
          camera.position.copy(c.target).addScaledVector(dirv, nextDistance);
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
      maxDistance={22}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2.25}
    />
  );
}

function TouchControls({
  input,
  onInteract,
  interactLabel,
}: {
  input: React.MutableRefObject<TouchInput>;
  onInteract: () => void;
  interactLabel?: string;
}) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pad = useRef<HTMLDivElement>(null);

  const move = (clientX: number, clientY: number) => {
    const rect = pad.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    const radius = rect.width * 0.34;
    const length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, radius / length);
    const x = dx * scale;
    const y = dy * scale;
    setKnob({ x, y });
    input.current = { x: x / radius, y: -y / radius };
  };
  const release = () => {
    setKnob({ x: 0, y: 0 });
    input.current = { x: 0, y: 0 };
  };

  return (
    <div className="world-touch" aria-label="Touch movement controls">
      <div
        ref={pad}
        className="world-touch__pad"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          move(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            move(event.clientX, event.clientY);
          }
        }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div
          className="world-touch__knob"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>
      {interactLabel && (
        <button className="world-touch__action" onClick={onInteract}>
          ✨ {interactLabel}
        </button>
      )}
    </div>
  );
}

// --- Main view -----------------------------------------------------------
type Dialogue = {
  title: string;
  text: string;
  action?: "start-quest" | "finish-quest";
};

const QUICK_CHAT = [
  "Hi! 👋",
  "Come with me! 🗺️",
  "I found a star! ⭐",
  "Let’s power a landmark! ✨",
  "Great job! 🎉",
];

export default function WorldView() {
  const { state } = useApp();
  const kidId = state.activeKid;
  const kid = getKid(state, kidId);
  const kidName = kid?.firstName || kid?.name || "Explorer";
  const loadout = currentLoadout(state, kidId);
  const canWebgl = useMemo(() => webglAvailable(), []);
  const event = useMemo(() => currentSeasonalEvent(), []);

  const self = useRef<Pose>(
    (() => {
      const citySpawn = developmentCitySpawn();
      if (citySpawn) return { ...citySpawn, moving: false };
      const sp = WORLD_MAP
        ? WORLD_MAP.spawn
        : SUBURB
          ? { x: 0, z: 4.25 } // begin beside Mayor Nova for immediate onboarding
          : spawnFor(kidId);
      const heading = WORLD_MAP || SUBURB ? Math.atan2(-sp.x, -sp.z) : 0;
      return { ...sp, heading, moving: false };
    })(),
  );
  const propsRef = useRef<THREE.Group>(null);
  const townRef = useRef<THREE.Group>(null);
  const touch = useRef<TouchInput>({ x: 0, y: 0 });
  const daylight = useRef(1);
  const audio = useMemo(() => new WorldAudioEngine(), []);

  const [selfUrl, setSelfUrl] = useState<string | null | undefined>(undefined);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [quickChat, setQuickChat] = useState(QUICK_CHAT[0]);
  const [myChat, setMyChat] = useState<{ text: string; ts: number } | null>(null);
  const [worldSave, setWorldSave] = useState<WorldSave>(() => loadWorldSave(kidId));
  const [nearest, setNearest] = useState<InteractionTarget | null>(null);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [yardOpen, setYardOpen] = useState(false);
  const [celebrationId, setCelebrationId] = useState(0);
  const [clockLabel, setClockLabel] = useState("8:00 AM");
  const [soundOn, setSoundOn] = useState(false);
  const [syncReady, setSyncReady] = useState(() => worldSyncEnabled());
  // Track the active room code too, so a code→code change (not just on/off)
  // re-runs the join/subscribe effects instead of stranding us in the old room.
  const [syncCode, setSyncCode] = useState(() => worldRoomCode());
  const [qualityChoice, setQualityChoice] = useState<QualityChoice>(() =>
    loadQualityChoice(),
  );
  const [openDoors, setOpenDoors] = useState<Set<string>>(() => new Set());
  // Academy quest-chain progression (own persistence slice).
  const [academy, setAcademy] = useState<AcademyProgress>(() => loadAcademy(kidId));
  const [academyOpen, setAcademyOpen] = useState<AcademyQuestId | null>(null);
  const [academyChapter, setAcademyChapter] = useState(0);
  const [questLogOpen, setQuestLogOpen] = useState(false);
  const [battle, setBattle] = useState<{
    creature: Creature;
    questions: AcademyQuestion[];
  } | null>(null);
  const [boss, setBoss] = useState<{
    creature: Creature;
    questions: AcademyQuestion[];
  } | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const prevLevel = useRef(levelForXp(academy.xp));
  // True whenever any modal/panel is open — read by Rig to freeze avatar input.
  const uiLock = useRef(false);
  const quality = useMemo(() => resolveQuality(qualityChoice), [qualityChoice]);
  const interactions = useMemo(
    () => [
      ...interactionsFor(worldSave),
      ...cityDoorInteractions(openDoors),
      ...creatureInteractions(),
    ],
    [worldSave, openDoors],
  );

  // Always-current worldSave so the shared-game subscription can compute its
  // merge from the latest state without an impure setState updater.
  const worldSaveRef = useRef(worldSave);
  worldSaveRef.current = worldSave;

  const commitWorld = useCallback(
    (next: WorldSave) => {
      setWorldSave(next);
      saveWorldSave(kidId, next);
    },
    [kidId],
  );

  useEffect(() => {
    const next = loadWorldSave(kidId);
    setWorldSave(next);
    const nextAcademy = loadAcademy(kidId);
    setAcademy(nextAcademy);
    prevLevel.current = levelForXp(nextAcademy.xp);
    setAcademyOpen(null);
    setBattle(null);
    setBoss(null);
    setShopOpen(false);
    setLevelUp(null);
    const citySpawn = developmentCitySpawn();
    self.current = citySpawn
      ? { ...citySpawn, moving: false }
      : { x: 0, z: 4.25, heading: Math.PI, moving: false };
  }, [kidId]);

  // Keep the input-lock ref in sync with whatever panel is open.
  useEffect(() => {
    uiLock.current = Boolean(
      dialogue ||
        yardOpen ||
        academyOpen ||
        questLogOpen ||
        battle ||
        boss ||
        shopOpen,
    );
  }, [dialogue, yardOpen, academyOpen, questLogOpen, battle, boss, shopOpen]);

  useEffect(() => () => audio.dispose(), [audio]);

  useEffect(() => {
    const changed = () => {
      setSyncReady(worldSyncEnabled());
      setSyncCode(worldRoomCode());
    };
    window.addEventListener(SYNC_EVENT, changed);
    return () => window.removeEventListener(SYNC_EVENT, changed);
  }, []);

  // Resolve this kid's model, then announce presence if private family sync is on.
  useEffect(() => {
    if (!kid || !canWebgl) return;
    let alive = true;
    const outfit = itemById(loadout.outfit)?.value;
    const baseAsset = itemById(loadout.base)?.assetPath;
    resolveModelUrl(kidId, outfit, baseAsset).then((url) => {
      if (!alive) return;
      setSelfUrl(url);
      if (url && syncReady) {
        const sp = self.current;
        joinWorld({
          kidId,
          name: kidName,
          color: kid.color || "#6a5cff",
          modelUrl: url,
          x: sp.x,
          z: sp.z,
          heading: sp.heading,
        });
      }
    });
    return () => {
      alive = false;
      leaveWorld();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId, canWebgl, syncReady, syncCode]);

  useEffect(() => subscribeWorld(setPlayers), [syncReady, syncCode]);

  useEffect(
    () =>
      subscribeWorldGame((shared) => {
        if (!shared) return;
        // Pure: read the latest save from a ref, persist OUTSIDE setState, and
        // bail when the merge changed nothing so we don't churn state/localStorage
        // on every snapshot (the updater used to do both, impurely).
        const previous = worldSaveRef.current;
        let next = mergeCollectedStars(previous, Object.keys(shared.stars));
        next = activateLandmarks(
          next,
          Object.keys(shared.landmarks) as LandmarkId[],
          currentSeasonalEvent(),
        ).save;
        if (
          next.quest.phase === previous.quest.phase &&
          next.quest.collected.length === previous.quest.collected.length &&
          next.activatedLandmarks.length === previous.activatedLandmarks.length &&
          next.townTokens === previous.townTokens &&
          next.seasonalRewardId === previous.seasonalRewardId &&
          next.unlockedDecorations.length === previous.unlockedDecorations.length
        ) {
          return;
        }
        worldSaveRef.current = next;
        setWorldSave(next);
        saveWorldSave(kidId, next);
      }),
    [kidId, syncCode],
  );

  useEffect(() => {
    const id = window.setInterval(() => updateSelf({}, true), 4000);
    return () => window.clearInterval(id);
  }, [syncReady]);

  const celebrate = useCallback(() => {
    setCelebrationId((value) => value + 1);
    audio.celebration();
  }, [audio]);

  const commitAcademy = useCallback(
    (next: AcademyProgress) => {
      setAcademy(next);
      saveAcademy(kidId, next);
    },
    [kidId],
  );

  const openAcademy = useCallback(
    (id: AcademyQuestId) => {
      const quest = academyById(id);
      if (!quest) return;
      setAcademyChapter(currentChapterIndex(academy, quest));
      setAcademyOpen(id);
    },
    [academy],
  );

  const onAcademyCorrect = useCallback(() => {
    commitAcademy(
      recordDailyEvent(recordCorrect(academy), "correct", 1, todayStr()),
    );
  }, [academy, commitAcademy]);

  const onAcademyChapterComplete = useCallback(
    (chapter: AcademyChapter) => {
      if (!academyOpen) return;
      const quest = academyById(academyOpen);
      if (!quest) return;
      const idx = currentChapterIndex(academy, quest);
      const { progress, firstForQuest } = completeChapter(academy, quest, idx);
      commitAcademy(recordDailyEvent(progress, "chapter", 1, todayStr()));
      // Award the chapter's tokens. Completing a quest's FIRST chapter also powers
      // that landmark's festival light — so the town lights up through learning.
      let nextSave: WorldSave = {
        ...worldSave,
        townTokens: worldSave.townTokens + chapter.rewardTokens,
      };
      if (firstForQuest) {
        nextSave = activateLandmarks(
          nextSave,
          [quest.questId],
          currentSeasonalEvent(),
        ).save;
        shareActivatedLandmark(quest.questId, { kidId, name: kidName });
      }
      commitWorld(nextSave);
      celebrate();
    },
    [
      academyOpen,
      academy,
      worldSave,
      kidId,
      kidName,
      commitAcademy,
      commitWorld,
      celebrate,
    ],
  );

  const openBattle = useCallback(
    (creatureId: string) => {
      const creature = creatureById(creatureId);
      if (!creature) return;
      const lvl = levelForXp(academy.xp);
      if (!creatureUnlocked(creature, lvl)) {
        setDialogue({
          title: `${creature.emoji} ${creature.name}`,
          text: `This champion only challenges Level ${creature.unlockLevel}+ explorers. Keep learning to level up — you're Level ${lvl} now!`,
        });
        return;
      }
      const payload = { creature, questions: drawBattleQuestions(creature) };
      if (creature.boss) setBoss(payload);
      else setBattle(payload);
    },
    [academy],
  );

  const onBattleCorrect = useCallback(() => {
    commitAcademy(
      recordDailyEvent(recordCorrect(academy), "correct", 1, todayStr()),
    );
  }, [academy, commitAcademy]);

  const onBattleWin = useCallback(() => {
    if (!battle) return;
    commitAcademy(
      recordDailyEvent(
        befriend(academy, battle.creature.id),
        "battle-win",
        1,
        todayStr(),
      ),
    );
    const reward = 8 + battle.creature.puzzleLength * 2;
    commitWorld({ ...worldSave, townTokens: worldSave.townTokens + reward });
    celebrate();
  }, [battle, academy, worldSave, commitAcademy, commitWorld, celebrate]);

  const onBossWin = useCallback(() => {
    if (!boss) return;
    commitAcademy(
      recordDailyEvent(recordBossWin(academy), "battle-win", 1, todayStr()),
    );
    commitWorld({ ...worldSave, townTokens: worldSave.townTokens + 40 });
    celebrate();
  }, [boss, academy, worldSave, commitAcademy, commitWorld, celebrate]);

  const claimDailyReward = useCallback(() => {
    const today = todayStr();
    if (!dailyClaimable(academy, today)) return;
    const claimed = claimDaily(academy, today);
    commitAcademy(claimed);
    // Base 15 tokens + a streak bonus (3 per day, capped) to reward coming back.
    const bonus = Math.min(30, claimed.streak * 3);
    commitWorld({ ...worldSave, townTokens: worldSave.townTokens + 15 + bonus });
    celebrate();
  }, [academy, worldSave, commitAcademy, commitWorld, celebrate]);

  const onBuyAura = useCallback(
    (aura: Aura) => {
      if (academy.ownedAuras.includes(aura.id) || worldSave.townTokens < aura.price)
        return;
      commitWorld({
        ...worldSave,
        townTokens: worldSave.townTokens - aura.price,
      });
      commitAcademy(equipAura(ownAura(academy, aura.id), aura.id)); // buy + auto-equip
      celebrate();
    },
    [academy, worldSave, commitAcademy, commitWorld, celebrate],
  );

  const onEquipAura = useCallback(
    (id: string | null) => commitAcademy(equipAura(academy, id)),
    [academy, commitAcademy],
  );

  const onEquipCompanion = useCallback(
    (id: string | null) => commitAcademy(equipCompanion(academy, id)),
    [academy, commitAcademy],
  );

  // Celebrate crossing a level (from any XP source).
  useEffect(() => {
    const lvl = levelForXp(academy.xp);
    if (lvl > prevLevel.current) {
      setLevelUp(lvl);
      celebrate();
    }
    prevLevel.current = lvl;
  }, [academy.xp, celebrate]);

  useEffect(() => {
    if (levelUp === null) return;
    const id = window.setTimeout(() => setLevelUp(null), 3800);
    return () => window.clearTimeout(id);
  }, [levelUp]);

  const interact = useCallback(() => {
    if (!nearest) return;
    if (nearest.kind === "collectible") {
      const next = collectStar(worldSave, nearest.id);
      if (next !== worldSave) {
        commitWorld(next);
        shareCollectedStar(nearest.id, { kidId, name: kidName });
        celebrate();
      }
      return;
    }
    if (nearest.kind === "npc") {
      if (worldSave.quest.phase === "available") {
        setDialogue({
          title: "Mayor Nova",
          text: "Five town stars tumbled out of the night sky! Will you explore the neighborhood and bring them home? Siblings in your family room can help.",
          action: "start-quest",
        });
      } else if (worldSave.quest.phase === "collecting") {
        setDialogue({
          title: "Mayor Nova",
          text: `You have ${worldSave.quest.collected.length} of 5 stars. Look for golden glows near each landmark—and one close to home.`,
        });
      } else if (worldSave.quest.phase === "return") {
        setDialogue({
          title: "Mayor Nova",
          text: "Every star is back! Let’s relight the town and add a Star Fountain to your yard collection.",
          action: "finish-quest",
        });
      } else {
        setDialogue({
          title: "Mayor Nova",
          text: "The town is shining because of you. Try powering all three landmarks for the seasonal festival reward!",
        });
      }
      return;
    }
    if (nearest.kind === "landmark") {
      // Landmarks are the three Academies — walking up opens that subject's
      // story-driven learning quest (reading / math / science).
      openAcademy(nearest.id);
      return;
    }
    if (nearest.kind === "creature") {
      // Friendly brain-creatures — walking up starts a turn-based quiz duel.
      openBattle(nearest.id);
      return;
    }
    if (nearest.kind === "door") {
      setOpenDoors((current) => {
        const next = new Set(current);
        if (next.has(nearest.id)) next.delete(nearest.id);
        else next.add(nearest.id);
        return next;
      });
      return;
    }
    setYardOpen(true);
  }, [
    nearest,
    worldSave,
    commitWorld,
    kidId,
    kidName,
    celebrate,
    openAcademy,
    openBattle,
  ]);

  useEffect(() => {
    const press = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDialogue(null);
        setYardOpen(false);
        setAcademyOpen(null);
        setQuestLogOpen(false);
        setBattle(null);
        setBoss(null);
        setShopOpen(false);
        return;
      }
      if (event.repeat) return; // holding E must not re-fire interact (review fix)
      if (uiLock.current) return; // a panel is open — E does nothing in-world
      if ((event.key === "e" || event.key === "E") && document.activeElement?.tagName !== "SELECT") {
        event.preventDefault();
        interact();
      }
    };
    window.addEventListener("keydown", press);
    return () => window.removeEventListener("keydown", press);
  }, [interact]);

  const send = () => {
    sendChat(quickChat);
    setMyChat({ text: quickChat, ts: Date.now() });
  };

  const toggleSound = async () => {
    const next = !soundOn;
    setSoundOn(next);
    await audio.setEnabled(next);
  };

  const changeQuality = (choice: QualityChoice) => {
    setQualityChoice(choice);
    saveQualityChoice(choice);
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
        🌍 Pick a character on the <strong>Avatar</strong> tab first — then come play in the World!
      </div>
    );

  // Pick the most-recent record for this kid (per-session suffix means a second
  // tab/device can share the kidId) so we never show a stale session's bubble.
  const selfChat =
    players
      .filter((player) => player.kidId === kidId)
      .sort((a, b) => (b.t ?? 0) - (a.t ?? 0))[0]?.chat ?? null;
  const others = Array.from(
    new Map(
      players
        .filter((player) => player.kidId !== kidId && player.modelUrl)
        .map((player) => [player.kidId, player]),
    ).values(),
  );
  const presentCount = 1 + others.length;
  const questCount = worldSave.quest.collected.length;
  const festivalCount = worldSave.activatedLandmarks.length;
  const level = levelForXp(academy.xp);
  const xpBar = levelBar(academy.xp);
  const daily = dailyView(academy, todayStr());
  const streak = currentStreak(academy, todayStr());
  const buddies = CREATURES.filter((creature) => !creature.boss);
  const activeAcademyQuest = academyOpen ? academyById(academyOpen) : null;
  const promptLabel =
    nearest && nearest.kind === "landmark"
      ? `Learn at ${academyById(nearest.id as AcademyQuestId)?.title ?? nearest.label}`
      : nearest?.label;
  const anyPanelOpen = Boolean(
    dialogue ||
      yardOpen ||
      academyOpen ||
      questLogOpen ||
      battle ||
      boss ||
      shopOpen,
  );

  return (
    <div className="world">
      <Canvas
        key={quality.resolved}
        shadows={quality.shadows}
        dpr={quality.dpr}
        gl={{ antialias: quality.antialias, toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ position: [0, 9.5, 5.5], fov: 45 }}
      >
        <LivingSky
          shadows={quality.shadows}
          onClock={setClockLabel}
          onDaylight={(value) => {
            daylight.current = value;
          }}
        />
        <group ref={propsRef}>
          <VillageProps groupRef={townRef} shadows={quality.shadows} openDoors={openDoors} />
          <WorldLandmarks save={worldSave} />
        </group>
        <MayorNova />
        <QuestCollectibles save={worldSave} />
        <ChampionsRing unlocked={level >= CHAMPIONS_RING.unlockLevel} />
        <WorldCreatures befriended={academy.befriended} level={level} />
        <AmbientLife particleCount={quality.particles} birdCount={quality.birds} />
        <CelebrationBurst burstId={celebrationId} />
        <Rig
          self={self}
          propsRef={propsRef}
          touch={touch}
          interactions={interactions}
          openDoors={openDoors}
          onNear={setNearest}
          audio={audio}
          daylight={daylight}
          inputLock={uiLock}
        />
        {selfUrl && (
          <WorldAvatar
            url={selfUrl}
            getPose={() => self.current}
            name={`${kidName} (you)`}
            color={kid?.color || "#6a5cff"}
            chat={myChat ?? selfChat}
            shadows={quality.shadows}
            aura={auraById(academy.aura)}
            companion={
              academy.companion ? creatureById(academy.companion) : null
            }
          />
        )}
        {others.map((player) => {
          const pose: Pose = {
              x: player.x,
              z: player.z,
              heading: player.heading,
              moving: !!player.moving,
          };
          return (
            <WorldAvatar
              key={player.kidId}
              url={player.modelUrl}
              getPose={() => pose}
              name={player.name}
              color={player.color}
              chat={player.chat}
              shadows={quality.shadows}
            />
          );
        })}
      </Canvas>

      <div className="world-status" aria-live="polite">
        <div className="world-status__quest">
          <span className="world-status__eyebrow">⭐ LOST STARS</span>
          <strong>
            {worldSave.quest.phase === "available" && "Talk to Mayor Nova"}
            {worldSave.quest.phase === "collecting" && `${questCount}/5 found`}
            {worldSave.quest.phase === "return" && "Return to Mayor Nova"}
            {worldSave.quest.phase === "complete" && "Town restored!"}
          </strong>
          <div className="world-status__pips">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className={i < questCount ? "is-on" : ""}>★</span>
            ))}
          </div>
        </div>
        <div className="world-status__festival" style={{ borderColor: event.accent }}>
          <span>{event.emoji} {event.name}</span>
          <strong>{festivalCount}/{LANDMARKS.length} lights</strong>
        </div>
      </div>

      <div className="world-tools">
        <span className="world-tools__time">🕒 {clockLabel}</span>
        <span className="world-tools__tokens">🪙 {worldSave.townTokens}</span>
        <span className="world-tools__level" title={`${xpBar.into}/${xpBar.span} XP to next level`}>
          🎓 Lv {level}
        </span>
        <button onClick={() => setQuestLogOpen((open) => !open)}>
          📜 Quests{dailyClaimable(academy, todayStr()) ? " 🎁" : ""}
        </button>
        <button onClick={() => setShopOpen(true)}>🛍️ Shop</button>
        <button onClick={toggleSound}>{soundOn ? "🔊 Sound" : "🔇 Sound"}</button>
        <label>
          <span className="sr-only">World quality</span>
          <select
            value={qualityChoice}
            onChange={(e) => changeQuality(e.target.value as QualityChoice)}
          >
            <option value="auto">Auto · {quality.resolved}</option>
            <option value="high">High</option>
            <option value="balanced">Balanced</option>
            <option value="low">Low / iPad</option>
          </select>
        </label>
      </div>

      {nearest && !anyPanelOpen && (
        <button className="world-interact" onClick={interact}>
          <kbd>E</kbd> {promptLabel}
        </button>
      )}

      <TouchControls input={touch} onInteract={interact} interactLabel={promptLabel} />

      {dialogue && (
        <div className="world-dialogue" role="dialog" aria-modal="true" aria-labelledby="world-dialogue-title">
          <button className="world-dialogue__close" onClick={() => setDialogue(null)} aria-label="Close dialogue">×</button>
          <h3 id="world-dialogue-title">{dialogue.title}</h3>
          <p>{dialogue.text}</p>
          {dialogue.action === "start-quest" && (
            <button
              className="world-dialogue__primary"
              onClick={() => {
                commitWorld(startStarQuest(worldSave));
                setDialogue(null);
              }}
            >
              Start exploring ⭐
            </button>
          )}
          {dialogue.action === "finish-quest" && (
            <button
              className="world-dialogue__primary"
              onClick={() => {
                commitWorld(completeStarQuest(worldSave));
                setDialogue(null);
                celebrate();
              }}
            >
              Relight the town! 🎉
            </button>
          )}
        </div>
      )}

      {yardOpen && (
        <div className="world-dialogue world-yard" role="dialog" aria-modal="true" aria-labelledby="world-yard-title">
          <button className="world-dialogue__close" onClick={() => setYardOpen(false)} aria-label="Close yard decorator">×</button>
          <h3 id="world-yard-title">🏡 My Yard</h3>
          <p>Choose a decoration. New adventures unlock more.</p>
          <div className="world-yard__choices">
            {([
              ["starter-garden", "🌷", "Flower Garden"],
              ["star-fountain", "⛲", "Star Fountain"],
              ["seasonal-banner", event.emoji, `${event.name} Banner`],
            ] as [DecorationId, string, string][]).map(([id, emoji, label]) => {
              const unlocked = worldSave.unlockedDecorations.includes(id);
              return (
                <button
                  key={id}
                  disabled={!unlocked}
                  className={worldSave.selectedDecoration === id ? "is-selected" : ""}
                  onClick={() => commitWorld(selectDecoration(worldSave, id))}
                >
                  <span>{unlocked ? emoji : "🔒"}</span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeAcademyQuest && (
        <AcademyChallenge
          quest={activeAcademyQuest}
          chapterIndex={academyChapter}
          level={level}
          onCorrect={onAcademyCorrect}
          onChapterComplete={onAcademyChapterComplete}
          onClose={() => setAcademyOpen(null)}
        />
      )}

      {battle && (
        <BattleArena
          creature={battle.creature}
          questions={battle.questions}
          level={level}
          alreadyFriend={isBefriended(academy, battle.creature.id)}
          onCorrect={onBattleCorrect}
          onWin={onBattleWin}
          onClose={() => setBattle(null)}
        />
      )}

      {boss && (
        <BossArena
          creature={boss.creature}
          questions={boss.questions}
          level={level}
          dateStr={todayStr()}
          kidId={kidId}
          onCorrect={onBattleCorrect}
          onWin={onBossWin}
          onClose={() => setBoss(null)}
        />
      )}

      {shopOpen && (
        <WorldShop
          tokens={worldSave.townTokens}
          ownedAuras={academy.ownedAuras}
          equippedAura={academy.aura}
          befriended={academy.befriended}
          equippedCompanion={academy.companion}
          onBuyAura={onBuyAura}
          onEquipAura={onEquipAura}
          onEquipCompanion={onEquipCompanion}
          onClose={() => setShopOpen(false)}
        />
      )}

      {levelUp !== null && (
        <div className="world-levelup" role="status">
          <span className="world-levelup__star">⭐</span>
          <strong>Level Up!</strong>
          <span>
            You&apos;re now Lv {levelUp} · {levelTitle(levelUp)}
          </span>
        </div>
      )}

      {questLogOpen && (
        <div
          className="academy academy--log"
          role="dialog"
          aria-modal="true"
          aria-labelledby="questlog-title"
        >
          <div className="academy__card">
            <button
              className="academy__close"
              onClick={() => setQuestLogOpen(false)}
              aria-label="Close quest log"
            >
              ×
            </button>
            <div className="academy__head">
              <h3 id="questlog-title">📜 Quest Log</h3>
              <span className="academy__lv">
                🎓 Lv {level} · {levelTitle(level)}
              </span>
            </div>
            <div className="academy__xp">
              <div className="academy__xpbar">
                <span style={{ width: `${xpBar.pct}%` }} />
              </div>
              <span className="academy__xptext">
                {xpBar.into}/{xpBar.span} XP to Lv {level + 1}
              </span>
            </div>

            <div className={`academy__daily${daily.complete ? " is-complete" : ""}`}>
              <div className="academy__dailytop">
                <span>
                  {daily.quest.emoji} Daily Quest
                  {streak > 0 && <em className="academy__streak"> 🔥 {streak}</em>}
                </span>
                <span>
                  {Math.min(daily.progress, daily.quest.goal)}/{daily.quest.goal}
                </span>
              </div>
              <strong>{daily.quest.label}</strong>
              <div className="academy__dailybar">
                <span
                  style={{
                    width: `${Math.round((daily.progress / daily.quest.goal) * 100)}%`,
                  }}
                />
              </div>
              {daily.claimed ? (
                <span className="academy__dailydone">✅ Claimed today — back tomorrow!</span>
              ) : daily.complete ? (
                <button className="academy__dailyclaim" onClick={claimDailyReward}>
                  Claim reward 🎁 +25 XP · 🪙 15
                </button>
              ) : (
                <span className="academy__dailyhint">Reward: 🎁 +25 XP · 🪙 15 tokens</span>
              )}
            </div>

            <ul className="academy__quests">
              {ACADEMY_QUESTS.map((quest) => {
                const status = questStatus(academy, quest);
                const done = chaptersDone(academy, quest.questId);
                const total = quest.chapters.length;
                return (
                  <li key={quest.questId} className={`academy__quest is-${status}`}>
                    <span className="academy__questemoji">{quest.emoji}</span>
                    <span className="academy__questmeta">
                      <strong>{quest.title}</strong>
                      <small>
                        {status === "not-started" && `Visit ${quest.giver} to begin`}
                        {status === "in-progress" &&
                          `Chapter ${done + 1} of ${total} · with ${quest.giver}`}
                        {status === "complete" &&
                          `Complete! All ${total} chapters restored ⭐`}
                      </small>
                      <span className="academy__questbar">
                        <span style={{ width: `${Math.round((done / total) * 100)}%` }} />
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="academy__buddies">
              <div className="academy__buddieshead">
                <strong>⚔️ Brain Buddies</strong>
                <span>
                  {befriendedCount(academy)}/{buddies.length}
                </span>
              </div>
              <div className="academy__buddyrow">
                {buddies.map((creature) => {
                  const friend = isBefriended(academy, creature.id);
                  const locked = !creatureUnlocked(creature, level);
                  return (
                    <span
                      key={creature.id}
                      className={`academy__buddy${friend ? " is-friend" : ""}`}
                      title={
                        friend
                          ? `${creature.name} — befriended!`
                          : locked
                            ? `${creature.name} — unlocks at Lv ${creature.unlockLevel}`
                            : `${creature.name} — challenge to befriend`
                      }
                    >
                      {locked ? "🔒" : creature.emoji}
                      {friend && <em>💚</em>}
                    </span>
                  );
                })}
              </div>
              {academy.bossWins > 0 && (
                <div className="academy__bosswins">
                  🏆 Boss raids won: <strong>{academy.bossWins}</strong>
                </div>
              )}
            </div>

            <p className="academy__hinttext">
              Press <kbd>E</kbd> at 📚🛠️🔭 landmarks to learn, battle roaming{" "}
              <strong>⚔️ creatures</strong>, and reach Lv {CHAMPIONS_RING.unlockLevel}{" "}
              for the 🏆 Champions&apos; Ring.
            </p>
          </div>
        </div>
      )}

      <div className="world__hud">
        <div className="world__hint">
          <strong>Move</strong> WASD/arrows · <strong>interact</strong> E · {presentCount} here
          {!syncReady && <span> · Solo mode</span>}
        </div>
        {syncReady ? (
          <div className="world__chat">
            <select className="world__chatinput" value={quickChat} onChange={(e) => setQuickChat(e.target.value)}>
              {QUICK_CHAT.map((phrase) => <option key={phrase}>{phrase}</option>)}
            </select>
            <button className="world__send" onClick={send}>Say 💬</button>
          </div>
        ) : (
          <div className="world__solo">Add a private Family Sync code in Grown-Ups to enable sibling co-op.</div>
        )}
      </div>
    </div>
  );
}
