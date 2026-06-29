import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { resolveAssetUrl } from "../features/avatar/AvatarManifest";
import { disposeObject3D } from "./disposeObject";
import { ProximityHtml } from "./worldLabels";
import type { InteractionTarget } from "./worldGame";

const WIDTH = 6.35;
const DEPTH = 6.35;
const WALL_THICKNESS = 0.18;
const DOOR_WIDTH = 1.35;
const AVATAR_RADIUS = 0.32;

// Per-building silhouette variety so the ring reads as a street of different
// shops, not 12 identical boxes. Footprint never changes (colliders depend on
// it) — only wall height + roof shape. Art-directed by building index.
const ROOF_COLORS = ["#d6855c", "#c76b78", "#6f9bc4", "#7aa86a", "#e0a35c", "#9f7bc0"];
type RoofStyle = "hip" | "flat";
const VARIETY: { h: number; roof: RoofStyle }[] = [
  { h: 3.1, roof: "hip" },
  { h: 4.4, roof: "flat" },
  { h: 3.4, roof: "hip" },
  { h: 3.25, roof: "hip" },
  { h: 4.7, roof: "flat" },
  { h: 3.3, roof: "hip" },
  { h: 3.7, roof: "hip" },
  { h: 4.3, roof: "flat" },
  { h: 3.25, roof: "hip" },
  { h: 3.5, roof: "hip" },
  { h: 4.5, roof: "flat" },
  { h: 3.2, roof: "hip" },
];

export type CityBuildingDef = {
  id: string;
  name: string;
  emoji: string;
  x: number;
  z: number;
  rotation: number;
  color: string;
  accent: string;
  interior: "cafe" | "books" | "studio" | "community";
};

// The four middle lots are the landmark district. These twelve street-fronted
// lots form a mixed-use perimeter with entrances facing the nearest road.
export const CITY_BUILDINGS: CityBuildingDef[] = [
  { id: "corner-market", name: "Corner Market", emoji: "🛒", x: -24, z: -24, rotation: 0, color: "#f4c987", accent: "#e36d54", interior: "cafe" },
  { id: "wellness-center", name: "Wellness Center", emoji: "🌿", x: -24, z: -8, rotation: Math.PI / 2, color: "#cae7d4", accent: "#4aa879", interior: "community" },
  { id: "rainbow-books", name: "Rainbow Books", emoji: "📚", x: -24, z: 8, rotation: Math.PI / 2, color: "#dbd1f3", accent: "#755fc2", interior: "books" },
  { id: "park-apartments", name: "Park Apartments", emoji: "🏠", x: -24, z: 24, rotation: Math.PI, color: "#f1cfc5", accent: "#bd6f61", interior: "community" },
  { id: "sunbeam-cafe", name: "Sunbeam Café", emoji: "🥐", x: -8, z: -24, rotation: 0, color: "#ffe1a4", accent: "#df843a", interior: "cafe" },
  { id: "discovery-museum", name: "Discovery Museum", emoji: "🦕", x: 8, z: -24, rotation: 0, color: "#c9e4ed", accent: "#377f9d", interior: "community" },
  { id: "art-house", name: "Art House", emoji: "🎨", x: 24, z: -24, rotation: 0, color: "#f2c8df", accent: "#b9578c", interior: "studio" },
  { id: "fresh-grocer", name: "Fresh Grocer", emoji: "🍎", x: 24, z: -8, rotation: -Math.PI / 2, color: "#d8e9b2", accent: "#6b9e38", interior: "cafe" },
  { id: "maker-supply", name: "Maker Supply", emoji: "🧰", x: 24, z: 8, rotation: -Math.PI / 2, color: "#f5c69c", accent: "#c96c36", interior: "studio" },
  { id: "garden-homes", name: "Garden Homes", emoji: "🌼", x: 24, z: 24, rotation: Math.PI, color: "#cde3cb", accent: "#57966a", interior: "community" },
  { id: "little-library", name: "Little Library", emoji: "📖", x: -8, z: 24, rotation: Math.PI, color: "#d7d0ef", accent: "#725fb5", interior: "books" },
  { id: "recreation-hall", name: "Recreation Hall", emoji: "🏀", x: 8, z: 24, rotation: Math.PI, color: "#c9e2f2", accent: "#407da2", interior: "community" },
];

function worldFromLocal(building: CityBuildingDef, lx: number, lz: number) {
  const c = Math.cos(building.rotation);
  const s = Math.sin(building.rotation);
  return {
    x: building.x + c * lx + s * lz,
    z: building.z - s * lx + c * lz,
  };
}

export function cityDoorInteractions(openDoors: ReadonlySet<string>): InteractionTarget[] {
  return CITY_BUILDINGS.map((building) => {
    const position = worldFromLocal(building, 0, DEPTH / 2 + 0.8);
    return {
      id: building.id,
      kind: "door" as const,
      label: `${openDoors.has(building.id) ? "Close" : "Open"} ${building.name}`,
      position: [position.x, 0, position.z] as const,
      radius: 2.15,
    };
  });
}

/** Development playtest spawn immediately outside a named storefront. */
export function cityBuildingEntry(id: string) {
  const building = CITY_BUILDINGS.find((item) => item.id === id);
  if (!building) return null;
  const position = worldFromLocal(building, 0, DEPTH / 2 + 1.25);
  return {
    x: position.x,
    z: position.z,
    heading: Math.atan2(building.x - position.x, building.z - position.z),
  };
}

function pushOutOfRect(
  point: { x: number; z: number },
  cx: number,
  cz: number,
  halfWidth: number,
  halfDepth: number,
) {
  const dx = point.x - cx;
  const dz = point.z - cz;
  const limitX = halfWidth + AVATAR_RADIUS;
  const limitZ = halfDepth + AVATAR_RADIUS;
  if (Math.abs(dx) >= limitX || Math.abs(dz) >= limitZ) return;
  const penetrationX = limitX - Math.abs(dx);
  const penetrationZ = limitZ - Math.abs(dz);
  if (penetrationX < penetrationZ) {
    point.x = cx + (dx < 0 ? -limitX : limitX);
  } else {
    point.z = cz + (dz < 0 ? -limitZ : limitZ);
  }
}

/** Collide against wall segments, not solid footprints, so open doorways lead
 * into genuinely walkable rooms instead of teleporting through a sealed prop. */
export function resolveCityBuildingCollisions(
  pose: { x: number; z: number },
  openDoors: ReadonlySet<string>,
) {
  const halfW = WIDTH / 2;
  const halfD = DEPTH / 2;
  const doorHalf = DOOR_WIDTH / 2;
  for (const building of CITY_BUILDINGS) {
    const c = Math.cos(building.rotation);
    const s = Math.sin(building.rotation);
    const dx = pose.x - building.x;
    const dz = pose.z - building.z;
    const local = { x: c * dx - s * dz, z: s * dx + c * dz };
    if (Math.abs(local.x) > halfW + 1 || Math.abs(local.z) > halfD + 1) continue;

    const frontSegmentWidth = (WIDTH - DOOR_WIDTH) / 2;
    const frontCenter = (halfW + doorHalf) / 2;
    pushOutOfRect(local, -frontCenter, halfD, frontSegmentWidth / 2, WALL_THICKNESS / 2);
    pushOutOfRect(local, frontCenter, halfD, frontSegmentWidth / 2, WALL_THICKNESS / 2);
    if (!openDoors.has(building.id)) {
      pushOutOfRect(local, 0, halfD, doorHalf, WALL_THICKNESS / 2);
    }
    pushOutOfRect(local, 0, -halfD, halfW, WALL_THICKNESS / 2);
    pushOutOfRect(local, -halfW, 0, WALL_THICKNESS / 2, halfD);
    pushOutOfRect(local, halfW, 0, WALL_THICKNESS / 2, halfD);

    pose.x = building.x + c * local.x + s * local.z;
    pose.z = building.z - s * local.x + c * local.z;
  }
}

type Kit = {
  door: THREE.Object3D;
  window: THREE.Object3D;
  downtown: THREE.Object3D;
  facadeWindows: THREE.Object3D[];
  doorFrame: THREE.Object3D | null;
};

function normalizeDetail(source: THREE.Object3D, height: number) {
  const object = source.clone(true);
  object.updateWorldMatrix(true, true);
  let box = new THREE.Box3().setFromObject(object);
  object.scale.setScalar(height / Math.max(0.001, box.max.y - box.min.y));
  object.updateWorldMatrix(true, true);
  box = new THREE.Box3().setFromObject(object);
  object.position.set(
    -(box.min.x + box.max.x) / 2,
    -box.min.y,
    -(box.min.z + box.max.z) / 2,
  );
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

function Interior({ type, accent }: { type: CityBuildingDef["interior"]; accent: string }) {
  if (type === "books") {
    return (
      <group>
        {[-2.2, 0, 2.2].map((x) => (
          <mesh key={x} position={[x, 0.9, -2.55]} castShadow>
            <boxGeometry args={[1.35, 1.8, 0.35]} />
            <meshStandardMaterial color={x === 0 ? accent : "#8b684d"} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.38, 0.15]} castShadow><boxGeometry args={[2.2, 0.75, 0.9]} /><meshStandardMaterial color="#c89963" /></mesh>
      </group>
    );
  }
  if (type === "studio") {
    return (
      <group>
        {[-1.65, 1.65].map((x) => (
          <group key={x} position={[x, 0, -0.6]}>
            <mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[1.5, 0.16, 1.2]} /><meshStandardMaterial color="#d6b07a" /></mesh>
            <mesh position={[0, 1.18, 0]} rotation={[0, 0.2, 0]}><boxGeometry args={[0.75, 0.7, 0.08]} /><meshStandardMaterial color={accent} /></mesh>
          </group>
        ))}
      </group>
    );
  }
  if (type === "cafe") {
    return (
      <group>
        {[-1.65, 1.65].map((x) => (
          <group key={x} position={[x, 0, -0.65]}>
            <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.72, 0.72, 0.12, 18]} /><meshStandardMaterial color="#d7a266" /></mesh>
            <mesh position={[0, 0.36, 0]}><cylinderGeometry args={[0.1, 0.16, 0.7, 10]} /><meshStandardMaterial color="#5c4b45" /></mesh>
          </group>
        ))}
        <mesh position={[0, 0.55, -2.5]} castShadow><boxGeometry args={[3.2, 1.1, 0.45]} /><meshStandardMaterial color={accent} /></mesh>
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, 0.08, -0.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[4.2, 3.3]} /><meshStandardMaterial color={accent} roughness={1} /></mesh>
      {[-1.6, 1.6].map((x) => <mesh key={x} position={[x, 0.45, -1.25]} castShadow><boxGeometry args={[1.2, 0.85, 0.55]} /><meshStandardMaterial color="#7ca4b8" /></mesh>)}
    </group>
  );
}

function EnterableBuilding({
  building,
  index,
  open,
  kit,
  shadows,
}: {
  building: CityBuildingDef;
  index: number;
  open: boolean;
  kit: Kit | null;
  shadows: boolean;
}) {
  const variety = VARIETY[index % VARIETY.length];
  const wallH = variety.h;
  const roofColor = ROOF_COLORS[index % ROOF_COLORS.length];
  const hinge = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!hinge.current) return;
    const target = open ? -Math.PI * 0.48 : 0;
    // Skip the damp once the door has effectively settled so 12 idle doors don't
    // each run easing math every frame.
    if (Math.abs(hinge.current.rotation.y - target) < 0.0005) return;
    hinge.current.rotation.y = THREE.MathUtils.damp(hinge.current.rotation.y, target, 8, dt);
  });
  const door = useMemo(() => kit ? normalizeDetail(kit.door, 2.15) : null, [kit]);
  const windows = useMemo(
    () => kit ? Array.from({ length: 4 }, () => normalizeDetail(kit.window, 1.05)) : [],
    [kit],
  );
  const facadeWindows = useMemo(() => {
    if (!kit?.facadeWindows.length) return [];
    const seed = CITY_BUILDINGS.findIndex((item) => item.id === building.id);
    const source = kit.facadeWindows[Math.abs(seed) % kit.facadeWindows.length];
    return [normalizeDetail(source, 3), normalizeDetail(source, 3)];
  }, [building.id, kit]);
  const doorFrame = useMemo(
    () => kit?.doorFrame ? normalizeDetail(kit.doorFrame, 2.72) : null,
    [kit],
  );
  const halfW = WIDTH / 2;
  const halfD = DEPTH / 2;
  const frontWidth = (WIDTH - DOOR_WIDTH) / 2;
  const frontCenter = (halfW + DOOR_WIDTH / 2) / 2;

  return (
    <group position={[building.x, 0, building.z]} rotation={[0, building.rotation, 0]}>
      <mesh position={[0, 0.05, 0]} receiveShadow><boxGeometry args={[7.5, 0.1, 7.5]} /><meshStandardMaterial color="#c9ccd0" roughness={1} /></mesh>
      <mesh position={[0, 0.13, 0]} receiveShadow><boxGeometry args={[WIDTH - 0.25, 0.12, DEPTH - 0.25]} /><meshStandardMaterial color="#e8dfca" roughness={0.95} /></mesh>

      <mesh position={[-frontCenter, wallH / 2, halfD]} castShadow={shadows}><boxGeometry args={[frontWidth, wallH, WALL_THICKNESS]} /><meshStandardMaterial color={building.color} /></mesh>
      <mesh position={[frontCenter, wallH / 2, halfD]} castShadow={shadows}><boxGeometry args={[frontWidth, wallH, WALL_THICKNESS]} /><meshStandardMaterial color={building.color} /></mesh>
      <mesh position={[0, (2.3 + wallH) / 2, halfD]} castShadow={shadows}><boxGeometry args={[DOOR_WIDTH, Math.max(0.2, wallH - 2.3), WALL_THICKNESS]} /><meshStandardMaterial color={building.color} /></mesh>
      <mesh position={[0, wallH / 2, -halfD]} castShadow={shadows}><boxGeometry args={[WIDTH, wallH, WALL_THICKNESS]} /><meshStandardMaterial color={building.color} /></mesh>
      <mesh position={[-halfW, wallH / 2, 0]} castShadow={shadows}><boxGeometry args={[WALL_THICKNESS, wallH, DEPTH]} /><meshStandardMaterial color={building.color} /></mesh>
      <mesh position={[halfW, wallH / 2, 0]} castShadow={shadows}><boxGeometry args={[WALL_THICKNESS, wallH, DEPTH]} /><meshStandardMaterial color={building.color} /></mesh>

      {/* sign board + storefront awning */}
      <mesh position={[0, wallH - 0.5, halfD + 0.13]} castShadow><boxGeometry args={[2.65, 0.5, 0.14]} /><meshStandardMaterial color={building.accent} /></mesh>
      <mesh position={[0, 2.18, halfD + 0.42]} rotation={[-0.52, 0, 0]} castShadow={shadows}>
        <boxGeometry args={[DOOR_WIDTH + 1.15, 0.1, 0.92]} />
        <meshStandardMaterial color={building.accent} roughness={0.7} />
      </mesh>
      <ProximityHtml position={[0, wallH + 0.28, halfD + 0.23]} radius={9} distanceFactor={12}>
        <div className="world-building-sign">{building.emoji} {building.name}</div>
      </ProximityHtml>

      {facadeWindows.length > 0
        ? facadeWindows.map((window, index) => (
            <primitive
              key={index}
              object={window}
              position={[index === 0 ? -2.08 : 2.08, 0.16, halfD + 0.18]}
            />
          ))
        : windows.map((window, index) => (
            <primitive key={index} object={window} position={[index < 2 ? -2.05 : 2.05, index % 2 ? 2.05 : 1.1, halfD + 0.13]} />
          ))}

      {doorFrame && (
        <primitive object={doorFrame} position={[0, 0.12, halfD + 0.19]} />
      )}

      <group ref={hinge} position={[-DOOR_WIDTH / 2, 0, halfD + 0.13]}>
        {door ? (
          <primitive object={door} position={[DOOR_WIDTH / 2, 0, 0]} />
        ) : (
          <mesh position={[DOOR_WIDTH / 2, 1.05, 0]} castShadow><boxGeometry args={[DOOR_WIDTH, 2.1, 0.12]} /><meshStandardMaterial color="#8b5d3b" /></mesh>
        )}
      </group>

      {open && <Interior type={building.interior} accent={building.accent} />}
      {/* Warm "lights on" glow when open — an emissive panel instead of a real
          pointLight, so opening every door doesn't stack N real-time lights. */}
      {open && (
        <mesh position={[0, wallH - 0.18, 0]}>
          <boxGeometry args={[WIDTH - 0.7, 0.08, DEPTH - 0.7]} />
          <meshStandardMaterial
            color="#fff3d2"
            emissive="#ffe2a4"
            emissiveIntensity={1.5}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* Structural roof slab — camera-ignored + fades to a cutaway when the door
          opens so you can see inside. Coloured to match the decorative roof. */}
      <mesh
        position={[0, wallH + 0.1, 0]}
        castShadow={shadows}
        receiveShadow
        userData={{ cameraIgnore: true }}
      >
        <boxGeometry args={[WIDTH + 0.28, 0.2, DEPTH + 0.28]} />
        <meshStandardMaterial color={roofColor} transparent opacity={open ? 0.16 : 1} depthWrite={!open} />
      </mesh>
      {/* Decorative roof — a hipped peak or a flat parapet, hidden while open so
          it never blocks the cutaway interior view. */}
      {variety.roof === "hip" ? (
        <mesh
          position={[0, wallH + 1.05, 0]}
          rotation={[0, Math.PI / 4, 0]}
          visible={!open}
          castShadow={shadows}
          userData={{ cameraIgnore: true }}
        >
          <coneGeometry args={[WIDTH * 0.74, 1.7, 4]} />
          <meshStandardMaterial color={roofColor} roughness={1} flatShading />
        </mesh>
      ) : (
        <mesh
          position={[0, wallH + 0.42, 0]}
          visible={!open}
          castShadow={shadows}
          userData={{ cameraIgnore: true }}
        >
          <boxGeometry args={[WIDTH + 0.42, 0.52, DEPTH + 0.42]} />
          <meshStandardMaterial color={roofColor} roughness={1} />
        </mesh>
      )}
      <mesh position={[0, 1.15, halfD + 0.02]}><boxGeometry args={[DOOR_WIDTH + 0.35, 2.45, 0.05]} /><meshBasicMaterial color={building.accent} transparent opacity={open ? 0.16 : 0} depthWrite={false} /></mesh>
    </group>
  );
}

export function CityBuildings({ openDoors, shadows }: { openDoors: ReadonlySet<string>; shadows: boolean }) {
  const [kit, setKit] = useState<Kit | null>(null);
  useEffect(() => {
    let alive = true;
    let loaded: Kit | null = null;
    const loader = new GLTFLoader();
    Promise.all([
      loader.loadAsync(resolveAssetUrl("/assets/world/city-modular/door-brown-window.glb")),
      loader.loadAsync(resolveAssetUrl("/assets/world/city-modular/window-white-wide.glb")),
      loader.loadAsync(resolveAssetUrl("/assets/world/downtown-city/downtown-facades.glb")),
    ]).then(([door, window, downtown]) => {
      const facadeWindows = [
        downtown.scene.getObjectByName("Metal_FirstFloor_Window"),
        downtown.scene.getObjectByName("Trim_FirstFloor_Window.001"),
        downtown.scene.getObjectByName("Brick_Window_CurvedDouble"),
      ].filter((item): item is THREE.Object3D => Boolean(item));
      loaded = {
        door: door.scene,
        window: window.scene,
        downtown: downtown.scene,
        facadeWindows,
        doorFrame: downtown.scene.getObjectByName("DoorFrame_Trim") ?? null,
      };
      if (alive) setKit(loaded);
      else {
        disposeObject3D(loaded.door);
        disposeObject3D(loaded.window);
        disposeObject3D(loaded.downtown);
      }
    }).catch((error) => {
      console.warn(
        "CityBuildings: detail kit failed to load; using fallback geometry.",
        error,
      );
    });
    return () => {
      alive = false;
      // Free the GLB geometry/materials/textures (and the per-building clones that
      // share them) so the kit doesn't leak GPU memory on every Canvas remount.
      if (loaded) {
        disposeObject3D(loaded.door);
        disposeObject3D(loaded.window);
        disposeObject3D(loaded.downtown);
      }
    };
  }, []);

  return (
    <group>
      {CITY_BUILDINGS.map((building, index) => (
        <EnterableBuilding key={building.id} building={building} index={index} open={openDoors.has(building.id)} kit={kit} shadows={shadows} />
      ))}
    </group>
  );
}
