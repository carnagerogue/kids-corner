// ---------------------------------------------------------------------------
// AvatarViewer — the 3D character stage (Three.js / React-Three-Fiber).
//
// This whole module is LAZY-LOADED by AvatarStage so the heavy 3D libraries
// (three, fiber, drei, three-vrm) are only fetched when a learner actually opens
// the 3D view — keeping the main bundle light for school Chromebooks.
//
// Rendering strategy (Progressive 3D):
//   • If the equipped base model has a real .vrm at its assetPath, load it with
//     @pixiv/three-vrm and show it.
//   • Otherwise (the default until you add assets), render an original
//     PROCEDURAL chibi built from primitives, tinted by the learner's chosen
//     colors, with idle bob + wave/jump/victory/think emotes. No asset needed.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, type VRM } from "@pixiv/three-vrm";
import type { Loadout3D } from "../../types";
import { itemById, resolveAssetUrl } from "./AvatarManifest";
import type { EmoteName } from "./webgl";

function colorOf(loadout: Loadout3D, slot: keyof Loadout3D, fallback: string): string {
  const item = itemById(loadout[slot]);
  return (item?.value && item.value.startsWith("#") ? item.value : item?.color) || fallback;
}
function styleOf(loadout: Loadout3D, slot: keyof Loadout3D): string {
  return itemById(loadout[slot])?.value ?? "";
}

type Pose = {
  group: THREE.Group | null;
  lArm: THREE.Group | null;
  rArm: THREE.Group | null;
  head: THREE.Group | null;
};

// --- Procedural chibi -------------------------------------------------------

function ProceduralCharacter({
  loadout,
  emote,
}: {
  loadout: Loadout3D;
  emote: { name: EmoteName; key: number };
}) {
  const skin = colorOf(loadout, "skinTone", "#f3c19a");
  const hairColor = colorOf(loadout, "hairColor", "#3a2a3a");
  const eyeColor = colorOf(loadout, "eyeColor", "#5b3a29");
  const outfit = itemById(loadout.outfit);
  const outfitColor = outfit?.color ?? "#4f86c6";
  const shoeColor = itemById(loadout.shoes)?.color ?? "#ffffff";
  const hairStyle = styleOf(loadout, "hairStyle") || "short";
  const bodyType = itemById(loadout.base)?.bodyType ?? "neutral";

  const refs = useRef<Pose>({ group: null, lArm: null, rArm: null, head: null });
  const emoteStart = useRef(-10);
  const lastKey = useRef(emote.key);

  // Retrigger the emote clock whenever the key changes.
  useFrame(({ clock }) => {
    if (emote.key !== lastKey.current) {
      lastKey.current = emote.key;
      emoteStart.current = clock.elapsedTime;
    }
    const t = clock.elapsedTime;
    const e = t - emoteStart.current; // seconds into the current emote
    const active = e >= 0 && e < 1.4;
    const name = active ? emote.name : "idle";
    const { group, lArm, rArm, head } = refs.current;
    if (!group) return;

    // Idle breathing bob + gentle sway (always on).
    const bob = Math.sin(t * 2) * 0.025;
    let y = bob;
    let armL = 0.1;
    let armR = 0.1;
    let headTilt = Math.sin(t * 1.3) * 0.04;

    if (name === "wave") {
      armR = -2.3 + Math.sin(e * 14) * 0.35; // raised arm waving
    } else if (name === "jump") {
      y += Math.sin(Math.min(e / 0.45, 1) * Math.PI) * 0.45;
      armL = -1.6;
      armR = -1.6;
    } else if (name === "victory") {
      armL = -2.5;
      armR = -2.5;
      y += Math.abs(Math.sin(e * 6)) * 0.08;
    } else if (name === "think") {
      armR = -1.3;
      headTilt = 0.22;
    }

    group.position.y = y;
    if (lArm) lArm.rotation.z = armL;
    if (rArm) rArm.rotation.z = -armR;
    if (head) head.rotation.z = headTilt;
  });

  // girls a touch shorter torso + rounder; boys a touch broader. Subtle.
  const shoulder = bodyType === "boy" ? 0.42 : 0.36;

  return (
    <group ref={(g) => (refs.current.group = g)} position={[0, 0, 0]}>
      {/* Legs */}
      <mesh castShadow position={[-0.16, 0.28, 0]}>
        <capsuleGeometry args={[0.12, 0.34, 6, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <mesh castShadow position={[0.16, 0.28, 0]}>
        <capsuleGeometry args={[0.12, 0.34, 6, 12]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* Shoes */}
      <mesh castShadow position={[-0.16, 0.06, 0.04]}>
        <boxGeometry args={[0.2, 0.12, 0.3]} />
        <meshStandardMaterial color={shoeColor} />
      </mesh>
      <mesh castShadow position={[0.16, 0.06, 0.04]}>
        <boxGeometry args={[0.2, 0.12, 0.3]} />
        <meshStandardMaterial color={shoeColor} />
      </mesh>

      {/* Torso / outfit */}
      <mesh castShadow position={[0, 0.72, 0]}>
        <capsuleGeometry args={[shoulder, 0.46, 8, 16]} />
        <meshStandardMaterial color={outfitColor} />
      </mesh>

      {/* Arms (pivot at shoulder) */}
      <group ref={(g) => (refs.current.lArm = g)} position={[-shoulder - 0.04, 0.92, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.09, 0.34, 6, 12]} />
          <meshStandardMaterial color={outfitColor} />
        </mesh>
        <mesh castShadow position={[0, -0.44, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color={skin} />
        </mesh>
      </group>
      <group ref={(g) => (refs.current.rArm = g)} position={[shoulder + 0.04, 0.92, 0]}>
        <mesh castShadow position={[0, -0.22, 0]}>
          <capsuleGeometry args={[0.09, 0.34, 6, 12]} />
          <meshStandardMaterial color={outfitColor} />
        </mesh>
        <mesh castShadow position={[0, -0.44, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        <HandheldProp loadout={loadout} />
      </group>

      {/* Head group (big chibi head) */}
      <group ref={(g) => (refs.current.head = g)} position={[0, 1.35, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.42, 24, 24]} />
          <meshStandardMaterial color={skin} />
        </mesh>
        {/* Eyes — big glossy anime style */}
        <Eye x={-0.16} color={eyeColor} />
        <Eye x={0.16} color={eyeColor} />
        {/* Blush */}
        <mesh position={[-0.26, -0.06, 0.34]}>
          <circleGeometry args={[0.05, 16]} />
          <meshBasicMaterial color="#ff9bb3" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0.26, -0.06, 0.34]}>
          <circleGeometry args={[0.05, 16]} />
          <meshBasicMaterial color="#ff9bb3" transparent opacity={0.6} />
        </mesh>
        {/* Smile */}
        <mesh position={[0, -0.16, 0.39]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.06, 0.012, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#7a3b4a" />
        </mesh>
        <Hair style={hairStyle} color={hairColor} />
        <HatProp loadout={loadout} />
        <GlassesProp loadout={loadout} eyeColor={eyeColor} />
      </group>

      <BackpackProp loadout={loadout} />
      <PetProp loadout={loadout} />
      <AuraProp loadout={loadout} />
    </group>
  );
}

function Eye({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0.02, 0.36]}>
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.02, 0.03, 0.11]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Hair({ style, color }: { style: string; color: string }) {
  const cap = (
    <mesh position={[0, 0.12, -0.02]}>
      <sphereGeometry args={[0.45, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
  switch (style) {
    case "buzz":
      return (
        <mesh position={[0, 0.16, -0.02]}>
          <sphereGeometry args={[0.43, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );
    case "ponytail":
      return (
        <group>
          {cap}
          <mesh position={[0, 0.05, -0.42]} rotation={[0.5, 0, 0]}>
            <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case "twintails":
      return (
        <group>
          {cap}
          {[-0.42, 0.42].map((x) => (
            <mesh key={x} position={[x, 0.0, -0.1]} rotation={[0.2, 0, x < 0 ? 0.4 : -0.4]}>
              <capsuleGeometry args={[0.09, 0.46, 6, 12]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      );
    case "spacebuns":
      return (
        <group>
          {cap}
          {[-0.34, 0.34].map((x) => (
            <mesh key={x} position={[x, 0.34, -0.05]}>
              <sphereGeometry args={[0.16, 16, 16]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      );
    case "mohawk":
      return (
        <group>
          <mesh position={[0, 0.16, -0.02]}>
            <sphereGeometry args={[0.43, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.35]} />
            <meshStandardMaterial color="#2a1d2b" />
          </mesh>
          <mesh position={[0, 0.5, -0.02]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.1, 0.34, 0.5]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      );
    case "wavy":
      return (
        <group>
          {cap}
          {[-0.4, 0.4].map((x) => (
            <mesh key={x} position={[x, -0.18, 0.02]}>
              <capsuleGeometry args={[0.11, 0.32, 6, 12]} />
              <meshStandardMaterial color={color} />
            </mesh>
          ))}
        </group>
      );
    default:
      return cap;
  }
}

function HatProp({ loadout }: { loadout: Loadout3D }) {
  const hat = itemById(loadout.hat);
  if (!hat) return null;
  const c = hat.color;
  const style = hat.value;
  if (style === "crown") {
    return (
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.32, 0.36, 0.18, 8]} />
        <meshStandardMaterial color={c} metalness={0.6} roughness={0.3} />
      </mesh>
    );
  }
  if (style === "wizard") {
    return (
      <mesh position={[0, 0.62, 0]}>
        <coneGeometry args={[0.34, 0.6, 20]} />
        <meshStandardMaterial color={c} />
      </mesh>
    );
  }
  // generic cap / beanie / explorer / party
  return (
    <group position={[0, 0.42, 0]}>
      <mesh>
        <sphereGeometry args={[0.44, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshStandardMaterial color={c} />
      </mesh>
      {(style === "cap" || style === "explorer") && (
        <mesh position={[0, -0.02, 0.36]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.4, 0.04, 0.24]} />
          <meshStandardMaterial color={c} />
        </mesh>
      )}
    </group>
  );
}

function GlassesProp({ loadout, eyeColor }: { loadout: Loadout3D; eyeColor: string }) {
  const g = itemById(loadout.glasses);
  if (!g) return null;
  const c = g.value === "shades" || g.value === "goggles" ? "#1b1b1b" : g.color;
  return (
    <group position={[0, 0.02, 0.42]}>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <torusGeometry args={[0.12, 0.02, 8, 20]} />
          <meshStandardMaterial color={c} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.02]} />
        <meshStandardMaterial color={c} />
      </mesh>
      {eyeColor /* keep param used */ && null}
    </group>
  );
}

function BackpackProp({ loadout }: { loadout: Loadout3D }) {
  const b = itemById(loadout.backpack);
  if (!b) return null;
  return (
    <mesh position={[0, 0.78, -0.34]} castShadow>
      <boxGeometry args={[0.46, 0.5, 0.18]} />
      <meshStandardMaterial color={b.color} />
    </mesh>
  );
}

function HandheldProp({ loadout }: { loadout: Loadout3D }) {
  const h = itemById(loadout.handheld);
  if (!h) return null;
  // sits in the right hand (parent group is the right arm)
  return (
    <mesh position={[0, -0.5, 0.12]} rotation={[0.5, 0, 0]}>
      <boxGeometry args={[0.08, 0.34, 0.08]} />
      <meshStandardMaterial color={h.color} />
    </mesh>
  );
}

function PetProp({ loadout }: { loadout: Loadout3D }) {
  const p = itemById(loadout.pet);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = 0.22 + Math.sin(clock.elapsedTime * 3) * 0.05;
  });
  if (!p) return null;
  return (
    <group ref={ref} position={[0.62, 0.22, 0.1]}>
      <mesh castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color={p.color} />
      </mesh>
      <mesh position={[-0.07, 0.16, 0.02]}>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial color={p.color} />
      </mesh>
      <mesh position={[0.07, 0.16, 0.02]}>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial color={p.color} />
      </mesh>
      <mesh position={[0, 0.02, 0.17]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial color="#1b1b1b" />
      </mesh>
    </group>
  );
}

function AuraProp({ loadout }: { loadout: Loadout3D }) {
  const a = itemById(loadout.aura);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.8;
  });
  if (!a) return null;
  const count = 7;
  return (
    <group ref={ref} position={[0, 0.8, 0]}>
      {Array.from({ length: count }).map((_, i) => {
        const ang = (i / count) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(ang) * 0.75, Math.sin(i * 1.7) * 0.4, Math.sin(ang) * 0.75]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshBasicMaterial color={a.color} />
          </mesh>
        );
      })}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
        <torusGeometry args={[0.78, 0.02, 8, 40]} />
        <meshBasicMaterial color={a.color} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// --- Real VRM character (used when a .vrm asset exists) --------------------

function VrmCharacter({ url, onFail }: { url: string; onFail: () => void }) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  useEffect(() => {
    let alive = true;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader
      .loadAsync(url)
      .then((gltf) => {
        if (!alive) return;
        const loaded = gltf.userData.vrm as VRM | undefined;
        if (loaded) {
          loaded.scene.rotation.y = Math.PI; // face the camera
          setVrm(loaded);
        } else onFail();
      })
      .catch(() => alive && onFail());
    return () => {
      alive = false;
    };
  }, [url, onFail]);
  useFrame((_, delta) => vrm?.update(delta));
  if (!vrm) return null;
  return <primitive object={vrm.scene} position={[0, 0, 0]} />;
}

// --- Stage ------------------------------------------------------------------

export default function AvatarViewer({
  loadout,
  emote,
  interactive = true,
}: {
  loadout: Loadout3D;
  emote: { name: EmoteName; key: number };
  interactive?: boolean;
}) {
  const roomColor = itemById(loadout.room)?.color ?? "#2a1a4a";
  const base = itemById(loadout.base);
  const vrmUrl = base?.assetPath ? resolveAssetUrl(base.assetPath) : "";
  const [vrmFailed, setVrmFailed] = useState(false);
  const groundColor = useMemo(() => new THREE.Color(roomColor).lerp(new THREE.Color("#ffffff"), 0.4), [roomColor]);

  // Reset the VRM attempt when the base model changes.
  useEffect(() => setVrmFailed(false), [vrmUrl]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [0, 1.25, 3.2], fov: 35 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={[roomColor]} />
      <fog attach="fog" args={[roomColor, 6, 12]} />
      <hemisphereLight args={["#ffffff", roomColor, 1.1]} />
      <directionalLight
        position={[3, 5, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#a0c4ff" />

      {vrmUrl && !vrmFailed ? (
        <VrmCharacter url={vrmUrl} onFail={() => setVrmFailed(true)} />
      ) : (
        <ProceduralCharacter loadout={loadout} emote={emote} />
      )}

      {/* soft ground + contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[2.4, 48]} />
        <meshStandardMaterial color={`#${groundColor.getHexString()}`} />
      </mesh>
      <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={5} blur={2.4} far={3} />

      <OrbitControls
        enabled={interactive}
        enablePan={false}
        enableZoom={false}
        autoRotate={!interactive}
        autoRotateSpeed={1.2}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0.9, 0]}
      />
    </Canvas>
  );
}
