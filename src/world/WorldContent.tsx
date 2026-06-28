import { useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { resolveAssetUrl } from "../features/avatar/AvatarManifest";
import {
  STAR_COLLECTIBLES,
  currentSeasonalEvent,
  type DecorationId,
  type WorldSave,
} from "./worldGame";
import {
  CHAMPIONS_RING,
  CREATURES,
  creatureUnlocked,
  type Creature,
} from "./worldBattles";

const DAY = new THREE.Color("#bfe6ff");
const SUNSET = new THREE.Color("#f6a56f");
const NIGHT = new THREE.Color("#101a43");
const GROUND_DAY = new THREE.Color("#8abf75");
const GROUND_NIGHT = new THREE.Color("#334d55");

export function LivingSky({
  shadows,
  onClock,
  onDaylight,
}: {
  shadows: boolean;
  onClock: (label: string) => void;
  onDaylight: (value: number) => void;
}) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const ground = useRef<THREE.Mesh>(null);
  const { scene } = useThree();
  const sky = useMemo(() => new THREE.Color(), []);
  const groundColor = useMemo(() => new THREE.Color(), []);
  const fog = useMemo(() => new THREE.Fog(0xffffff, 19, 43), []);
  const lastUi = useRef(0);
  const start = useRef(performance.now());

  useFrame(({ clock }, dt) => {
    // A complete day in sixteen real minutes, beginning at a welcoming 8am.
    const elapsed = (performance.now() - start.current) / 1000;
    const hour = (8 + elapsed / 40) % 24;
    const sunAngle = ((hour - 6) / 24) * Math.PI * 2;
    const elevation = Math.sin(sunAngle);
    const daylight = THREE.MathUtils.smoothstep(elevation, -0.18, 0.35);
    const sunset = 1 - Math.min(1, Math.abs(elevation) * 4);
    sky.copy(NIGHT).lerp(DAY, daylight).lerp(SUNSET, sunset * 0.42);
    scene.background = sky;
    // Mutate one stable Fog instead of allocating a new THREE.Fog every frame.
    fog.color.copy(sky);
    fog.near = daylight > 0.2 ? 19 : 14;
    fog.far = daylight > 0.2 ? 43 : 35;
    scene.fog = fog;
    if (sun.current) {
      sun.current.position.set(
        Math.cos(sunAngle) * 18,
        Math.max(2, elevation * 20),
        Math.sin(sunAngle) * 18,
      );
      sun.current.intensity = 0.12 + daylight * 1.35;
      sun.current.color.set(daylight > 0.35 ? "#fff2d5" : "#ffae76");
    }
    if (hemi.current) hemi.current.intensity = 0.28 + daylight * 0.72;
    const material = ground.current?.material as THREE.MeshStandardMaterial | undefined;
    if (material) {
      groundColor.copy(GROUND_NIGHT).lerp(GROUND_DAY, daylight);
      material.color.copy(groundColor);
    }
    if (clock.elapsedTime - lastUi.current > 0.7) {
      lastUi.current = clock.elapsedTime;
      const whole = Math.floor(hour);
      const minute = Math.floor((hour - whole) * 60);
      const displayHour = whole % 12 || 12;
      onClock(`${displayHour}:${minute.toString().padStart(2, "0")} ${whole < 12 ? "AM" : "PM"}`);
      onDaylight(daylight);
    }
    // Keep TypeScript from considering dt unused while making the frame intent clear.
    void dt;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={["#d9efff", "#405d4a", 1]} />
      <directionalLight
        ref={sun}
        castShadow={shadows}
        position={[8, 14, 6]}
        intensity={1.4}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <ambientLight intensity={0.14} />
      <mesh ref={ground} receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 0]}>
        <circleGeometry args={[45, 64]} />
        <meshStandardMaterial color="#83c267" roughness={1} />
      </mesh>
    </>
  );
}

function LandmarkSign({ name, emoji, color }: { name: string; emoji: string; color: string }) {
  return (
    <group position={[0, 0, 2.85]}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[2.8, 0.82, 0.16]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[-0.9, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 1.1, 8]} />
        <meshStandardMaterial color="#6f482e" />
      </mesh>
      <mesh position={[0.9, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 1.1, 8]} />
        <meshStandardMaterial color="#6f482e" />
      </mesh>
      <Html position={[0, 0.72, 0.1]} center distanceFactor={11} occlude={false}>
        <div className="world-sign" style={{ borderColor: color }}>
          {emoji} {name}
        </div>
      </Html>
    </group>
  );
}

function StoryGrove({ active }: { active: boolean }) {
  const crown = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (crown.current) crown.current.rotation.z = Math.sin(clock.elapsedTime * 0.7) * 0.025;
  });
  return (
    <group>
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.62, 2.9, 10]} />
        <meshStandardMaterial color="#7a4f30" roughness={1} />
      </mesh>
      <group ref={crown} position={[0, 3.05, 0]}>
        {[
          [0, 0, 0],
          [1.05, -0.15, 0.15],
          [-1, -0.05, 0.2],
          [0.35, 0.55, -0.25],
        ].map((p, i) => (
          <mesh key={i} position={p as [number, number, number]} castShadow>
            <icosahedronGeometry args={[1.2 - i * 0.05, 1]} />
            <meshStandardMaterial
              color={active ? ["#55d880", "#78e89a", "#45c871", "#8af0a7"][i] : "#4e9e67"}
              emissive={active ? "#165b34" : "#000000"}
              emissiveIntensity={active ? 0.4 : 0}
              flatShading
            />
          </mesh>
        ))}
      </group>
      <mesh position={[1.5, 0.28, 0.2]} rotation={[0, -0.4, 0]} castShadow>
        <boxGeometry args={[1, 0.18, 0.72]} />
        <meshStandardMaterial color="#ffcf5a" />
      </mesh>
      <LandmarkSign name="Story Grove" emoji="📚" color="#49a86f" />
    </group>
  );
}

function MakerYard({ active }: { active: boolean }) {
  const wheel = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (wheel.current) wheel.current.rotation.z += dt * (active ? 2.4 : 0.65);
  });
  return (
    <group>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[3.6, 1.3, 2.6]} />
        <meshStandardMaterial color="#ffb053" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.48, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[2.55, 2.55, 2.8]} />
        <meshStandardMaterial color="#e66b4d" />
      </mesh>
      <group ref={wheel} position={[0, 2.75, 1.55]}>
        {[0, Math.PI / 2].map((r) => (
          <mesh key={r} rotation={[0, 0, r]} castShadow>
            <boxGeometry args={[0.18, 2.5, 0.12]} />
            <meshStandardMaterial color={active ? "#fff18b" : "#f5efe2"} emissive={active ? "#ffb81e" : "#000"} />
          </mesh>
        ))}
        <mesh castShadow>
          <sphereGeometry args={[0.24, 14, 10]} />
          <meshStandardMaterial color="#604a3a" />
        </mesh>
      </group>
      <mesh position={[-2, 0.55, 0.6]} castShadow>
        <boxGeometry args={[1.35, 0.2, 0.75]} />
        <meshStandardMaterial color="#6f482e" />
      </mesh>
      <LandmarkSign name="Maker Yard" emoji="🛠️" color="#ff9a4a" />
    </group>
  );
}

function SkyLab({ active }: { active: boolean }) {
  const telescope = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (telescope.current) {
      telescope.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.75;
    }
  });
  return (
    <group>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[2.25, 2.45, 0.64, 20]} />
        <meshStandardMaterial color="#e5e7ff" />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[1.9, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={active ? "#9688ff" : "#7067b5"}
          emissive={active ? "#3c2fab" : "#000"}
          emissiveIntensity={active ? 0.4 : 0}
        />
      </mesh>
      <group ref={telescope} position={[0, 1.3, 0.5]} rotation={[0.2, 0, -0.62]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.32, 0.42, 2.3, 14]} />
          <meshStandardMaterial color="#423c70" metalness={0.25} roughness={0.55} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <cylinderGeometry args={[0.48, 0.48, 0.22, 18]} />
          <meshStandardMaterial color="#8bdcff" emissive="#56bce9" emissiveIntensity={active ? 1.2 : 0.3} />
        </mesh>
      </group>
      <LandmarkSign name="Sky Lab" emoji="🔭" color="#7667e8" />
    </group>
  );
}

type NpcAvatarProps = {
  modelPath: string;
  name: string;
  emoji: string;
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
};

type LoadedNpcAvatar = {
  object: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  dispose: () => void;
};

async function loadNpcAvatar(modelPath: string): Promise<LoadedNpcAvatar> {
  const gltf = await new GLTFLoader().loadAsync(resolveAssetUrl(modelPath));
  const object = gltf.scene;

  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
    }
  });

  // Kenney's characters share a small source scale. Normalize every NPC to a
  // consistent 1.65 world-unit height and place its feet at ground level.
  object.updateWorldMatrix(true, true);
  let box = new THREE.Box3().setFromObject(object);
  const height = Math.max(0.001, box.max.y - box.min.y);
  object.scale.setScalar(1.65 / height);
  object.updateWorldMatrix(true, true);
  box = new THREE.Box3().setFromObject(object);
  object.position.set(
    -(box.min.x + box.max.x) / 2,
    -box.min.y,
    -(box.min.z + box.max.z) / 2,
  );

  const mixer = new THREE.AnimationMixer(object);
  const idle = THREE.AnimationClip.findByName(gltf.animations, "idle");
  if (idle) mixer.clipAction(idle).play();

  return {
    object,
    mixer,
    dispose: () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(object);
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      });
    },
  };
}

/** A rigged, animated GLB character from Kenney's CC0 Mini Characters set. */
function NpcAvatar({
  modelPath,
  name,
  emoji,
  position,
  rotationY = 0,
  scale = 1,
}: NpcAvatarProps) {
  const [avatar, setAvatar] = useState<LoadedNpcAvatar | null>(null);
  const avatarRef = useRef<LoadedNpcAvatar | null>(null);
  const animationTime = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let loaded: LoadedNpcAvatar | null = null;

    loadNpcAvatar(modelPath)
      .then((result) => {
        loaded = result;
        if (cancelled) {
          result.dispose();
          return;
        }
        avatarRef.current = result;
        setAvatar(result);
      })
      .catch((error) => {
        console.warn(`Could not load world avatar ${name}`, error);
      });

    return () => {
      cancelled = true;
      if (avatarRef.current === loaded) avatarRef.current = null;
      loaded?.dispose();
    };
  }, [modelPath, name]);

  // Cap background NPC animation at 30 Hz to keep several skinned VRMs cheap
  // enough for tablets while retaining the authored idle motion.
  useFrame((_, dt) => {
    animationTime.current += dt;
    if (animationTime.current < 1 / 30) return;
    avatarRef.current?.mixer.update(Math.min(animationTime.current, 0.1));
    animationTime.current = 0;
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {avatar && <primitive object={avatar.object} />}
      <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.46, 24]} />
        <meshBasicMaterial color="#253646" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <Html position={[0, 1.9, 0]} center distanceFactor={10} occlude={false}>
        <div className="world-npc-tag">{emoji} {name}</div>
      </Html>
    </group>
  );
}

export function WorldLandmarks({ save }: { save: WorldSave }) {
  const active = useMemo(
    () => new Set(save.activatedLandmarks),
    [save.activatedLandmarks],
  );
  return (
    <>
      <group position={[-8, 0, -8]}>
        <StoryGrove active={active.has("story-grove")} />
        <NpcAvatar
          modelPath="/assets/world/npcs/kenney-mini/character-female-f.glb"
          name="Story Keeper"
          emoji="🐸"
          position={[1.65, 0, 1.2]}
          rotationY={Math.PI * 0.75}
          scale={0.9}
        />
      </group>
      <group position={[8, 0, -8]}>
        <MakerYard active={active.has("maker-yard")} />
        <NpcAvatar
          modelPath="/assets/world/npcs/kenney-mini/character-male-e.glb"
          name="Maker Buddy"
          emoji="🛠️"
          position={[-1.8, 0, 1.2]}
          rotationY={-Math.PI * 0.75}
          scale={0.88}
        />
      </group>
      <group position={[8, 0, 8]}>
        <SkyLab active={active.has("sky-lab")} />
        <NpcAvatar
          modelPath="/assets/world/npcs/kenney-mini/character-male-c.glb"
          name="Sky Captain"
          emoji="🐱"
          position={[-1.75, 0, 1.35]}
          rotationY={-Math.PI * 0.25}
          scale={0.92}
        />
      </group>
      <HomeYard decoration={save.selectedDecoration} />
    </>
  );
}

function HomeYard({ decoration }: { decoration: DecorationId }) {
  const event = currentSeasonalEvent();
  return (
    <group position={[-8, 0, 8]}>
      {[[-2.6, 0], [2.6, 0], [0, -2.6], [0, 2.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]} rotation={[0, i > 1 ? Math.PI / 2 : 0, 0]}>
          <boxGeometry args={[0.15, 0.7, 4.9]} />
          <meshStandardMaterial color="#f8f1cf" />
        </mesh>
      ))}
      {decoration === "starter-garden" && (
        <group>
          {[[-1, -0.5], [0, 0.6], [1, -0.1], [-0.3, -1.1]].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <mesh position={[0, 0.28, 0]}>
                <cylinderGeometry args={[0.035, 0.05, 0.55, 6]} />
                <meshStandardMaterial color="#4b9c55" />
              </mesh>
              <mesh position={[0, 0.62, 0]}>
                <sphereGeometry args={[0.22, 10, 8]} />
                <meshStandardMaterial color={["#ff6e91", "#ffc84a", "#7ad6ff", "#b981ff"][i]} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {decoration === "star-fountain" && <StarFountain />}
      {decoration === "seasonal-banner" && (
        <group>
          <mesh position={[-1.8, 1.5, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
            <meshStandardMaterial color="#6c4a2e" />
          </mesh>
          <mesh position={[1.8, 1.5, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
            <meshStandardMaterial color="#6c4a2e" />
          </mesh>
          {[-1.2, -0.6, 0, 0.6, 1.2].map((x, i) => (
            <mesh key={i} position={[x, 2.35 - Math.abs(x) * 0.12, 0]} rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.3, 0.6, 3]} />
              <meshStandardMaterial color={i % 2 ? event.accent : "#fff3a8"} emissive={event.accent} emissiveIntensity={0.25} />
            </mesh>
          ))}
        </group>
      )}
      <LandmarkSign name="My Yard" emoji="🏡" color="#e984b2" />
    </group>
  );
}

function StarFountain() {
  const star = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (star.current) star.current.rotation.y += dt * 1.1;
  });
  return (
    <group>
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <cylinderGeometry args={[1.45, 1.6, 0.5, 24]} />
        <meshStandardMaterial color="#6fc9e9" metalness={0.05} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.16, 0.28, 1.2, 12]} />
        <meshStandardMaterial color="#d8f7ff" />
      </mesh>
      <mesh ref={star} position={[0, 1.75, 0]}>
        <octahedronGeometry args={[0.48, 0]} />
        <meshStandardMaterial color="#ffe46d" emissive="#ffc928" emissiveIntensity={1} />
      </mesh>
      <pointLight position={[0, 1.7, 0]} color="#ffe46d" intensity={1.2} distance={5} />
    </group>
  );
}

export function MayorNova() {
  return (
    <NpcAvatar
      modelPath="/assets/world/npcs/kenney-mini/character-female-d.glb"
      name="Mayor Nova"
      emoji="⭐"
      position={[0, 0, 2.2]}
      rotationY={Math.PI}
    />
  );
}

function FloatingStar({ position }: { position: readonly [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const baseY = position[1];
  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 1.7;
    group.current.position.y = baseY + Math.sin(clock.elapsedTime * 2.3 + position[0]) * 0.16;
  });
  return (
    <group ref={group} position={[position[0], position[1], position[2]]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial color="#fff278" emissive="#ffcb2f" emissiveIntensity={1.3} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.035, 8, 32]} />
        <meshBasicMaterial color="#fff4a8" transparent opacity={0.75} />
      </mesh>
      <pointLight color="#ffd84f" intensity={0.9} distance={4} />
    </group>
  );
}

function WorldCreature({
  creature,
  friend,
  locked,
}: {
  creature: Creature;
  friend: boolean;
  locked: boolean;
}) {
  const gem = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const size = creature.boss ? 0.72 : 0.5;
  const tint = locked ? "#9aa0ad" : creature.color;
  useFrame(({ clock }, dt) => {
    if (gem.current) {
      gem.current.position.y =
        creature.position[1] + Math.sin(clock.elapsedTime * 1.6) * 0.16;
      gem.current.rotation.y += dt * (creature.boss ? 0.5 : 0.9);
    }
    if (ring.current) ring.current.rotation.z += dt * 0.6;
  });
  const badge = locked ? "" : friend ? " 💚" : creature.boss ? " 🏆" : " ⚔️";
  return (
    <group position={[creature.position[0], 0, creature.position[2]]}>
      <mesh ref={gem} castShadow>
        <icosahedronGeometry args={[size, 0]} />
        <meshStandardMaterial
          color={tint}
          emissive={tint}
          emissiveIntensity={locked ? 0.12 : 0.45}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[size + 0.2, size + 0.45, 28]} />
        <meshBasicMaterial color={tint} transparent opacity={0.35} />
      </mesh>
      <Html position={[0, creature.position[1] + 0.95, 0]} center distanceFactor={11} occlude={false}>
        <div className="world-creature-tag" style={{ borderColor: tint }}>
          {locked ? "🔒" : creature.emoji} {creature.name}
          {locked ? ` · Lv ${creature.unlockLevel}` : badge}
        </div>
      </Html>
    </group>
  );
}

export function WorldCreatures({
  befriended,
  level,
}: {
  befriended: string[];
  level: number;
}) {
  return (
    <>
      {CREATURES.map((creature) => (
        <WorldCreature
          key={creature.id}
          creature={creature}
          friend={befriended.includes(creature.id)}
          locked={!creatureUnlocked(creature, level)}
        />
      ))}
    </>
  );
}

export function ChampionsRing({ unlocked }: { unlocked: boolean }) {
  return (
    <group position={[CHAMPIONS_RING.x, 0, CHAMPIONS_RING.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[CHAMPIONS_RING.radius - 0.6, CHAMPIONS_RING.radius, 56]} />
        <meshBasicMaterial
          color={unlocked ? "#ffcf52" : "#9aa0ad"}
          transparent
          opacity={0.5}
        />
      </mesh>
      <Html
        position={[0, 3.2, -CHAMPIONS_RING.radius + 1.2]}
        center
        distanceFactor={15}
        occlude={false}
      >
        <div className="world-ring-sign">
          🏆 Champions&apos; Ring{unlocked ? "" : ` · Lv ${CHAMPIONS_RING.unlockLevel}+`}
        </div>
      </Html>
    </group>
  );
}

export function QuestCollectibles({ save }: { save: WorldSave }) {
  if (save.quest.phase !== "collecting") return null;
  return (
    <>
      {STAR_COLLECTIBLES.filter((star) => !save.quest.collected.includes(star.id)).map((star) => (
        <FloatingStar key={star.id} position={star.position} />
      ))}
    </>
  );
}

export function AmbientLife({ particleCount, birdCount }: { particleCount: number; birdCount: number }) {
  const points = useRef<THREE.Points>(null);
  const birds = useRef<THREE.Group>(null);
  const event = currentSeasonalEvent();
  const positions = useMemo(() => {
    const data = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i * 2.39996) % (Math.PI * 2);
      const radius = 4 + ((i * 17) % 230) / 10;
      data[i * 3] = Math.cos(angle) * radius;
      data[i * 3 + 1] = 0.5 + ((i * 29) % 34) / 10;
      data[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return data;
  }, [particleCount]);
  useFrame(({ clock }, dt) => {
    if (points.current) {
      points.current.rotation.y += dt * 0.012;
      const array = points.current.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < array.length; i += 3) {
        array[i] += Math.sin(clock.elapsedTime * 0.65 + i) * dt * 0.025;
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
    if (birds.current) birds.current.rotation.y += dt * 0.08;
  });
  return (
    <>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={event.particle} size={0.075} transparent opacity={0.75} sizeAttenuation />
      </points>
      <group ref={birds} position={[0, 8, 0]}>
        {Array.from({ length: birdCount }, (_, i) => {
          const angle = (i / Math.max(1, birdCount)) * Math.PI * 2;
          const radius = 9 + (i % 3) * 2;
          return (
            <group key={i} position={[Math.cos(angle) * radius, (i % 3) * 0.5, Math.sin(angle) * radius]} rotation={[0, -angle, 0]}>
              <mesh rotation={[0, 0, 0.45]}>
                <coneGeometry args={[0.16, 0.58, 3]} />
                <meshBasicMaterial color="#33405c" side={THREE.DoubleSide} />
              </mesh>
              <mesh rotation={[0, 0, -0.45]}>
                <coneGeometry args={[0.16, 0.58, 3]} />
                <meshBasicMaterial color="#33405c" side={THREE.DoubleSide} />
              </mesh>
            </group>
          );
        })}
      </group>
    </>
  );
}

export function CelebrationBurst({ burstId }: { burstId: number }) {
  const group = useRef<THREE.Group>(null);
  const born = useRef(burstId);
  const bits = useMemo(
    () =>
      Array.from({ length: 44 }, (_, i) => ({
        angle: (i / 44) * Math.PI * 2,
        speed: 1.8 + (i % 7) * 0.22,
        y: 1.8 + (i % 5) * 0.22,
        color: ["#ffd84f", "#ff79ad", "#77dcff", "#92e684"][i % 4],
      })),
    [],
  );
  useFrame(({ clock }) => {
    if (!group.current) return;
    if (born.current !== burstId) {
      born.current = burstId;
      group.current.userData.started = clock.elapsedTime;
    }
    const t = clock.elapsedTime - (group.current.userData.started ?? -99);
    group.current.visible = t >= 0 && t < 2.4;
    group.current.children.forEach((child, i) => {
      const bit = bits[i];
      child.position.set(
        Math.cos(bit.angle) * bit.speed * t,
        bit.y + bit.speed * t - 2.2 * t * t,
        Math.sin(bit.angle) * bit.speed * t,
      );
      child.rotation.x += 0.08;
      child.rotation.z += 0.1;
    });
  });
  return (
    <group ref={group} position={[0, 1, 2.2]} visible={false}>
      {bits.map((bit, i) => (
        <mesh key={i}>
          <boxGeometry args={[0.12, 0.26, 0.06]} />
          <meshBasicMaterial color={bit.color} />
        </mesh>
      ))}
    </group>
  );
}
