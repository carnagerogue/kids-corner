// ---------------------------------------------------------------------------
// VRMAvatarViewer — the REAL VRoid/.vrm character stage (Three.js / R3F).
//
// This whole module is LAZY-LOADED (import("./VRMAvatarViewer")) so the heavy
// 3D libraries (three, fiber, drei, @pixiv/three-vrm) are only fetched when a
// learner actually opens the 3D view — keeping the main bundle light for school
// Chromebooks. It is the ONLY module that imports three / three-vrm.
//
// The character is the imported VRM ONLY — there is NO procedural body/head/eyes/
// hair geometry here. The ground plane, contact shadow and lights are *stage*,
// not character. Equipped GLB accessories are attached to the VRM by bone IFF a
// real .glb exists for the slot; missing accessories are silently skipped (never
// substituted with primitive geometry).
//
// On ANY load failure we call onError() and render nothing meaningful — the
// caller (AvatarStage) swaps in a 2D placeholder.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
  type VRMAnimation,
} from "@pixiv/three-vrm-animation";
import type { Loadout3D } from "../../types";
import { itemById, resolveAssetUrl, useAvatarManifest } from "./AvatarManifest";
import {
  attachAccessories,
  captureHeadBind,
  recolorVrm,
  tickAccessories,
  type AttachedAccessories,
  type HeadBind,
} from "./vrmAccessories";
import type { EmoteName } from "./webgl";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type VRMAvatarViewerProps = {
  /** Absolute, already-HEAD-probed URL to a .vrm. */
  modelUrl: string;
  /** Equipped cosmetics — used ONLY to attach real GLB accessories by bone. */
  loadout: Loadout3D;
  /** Active emote; bumping `key` retriggers the same-named emote. */
  emote: { name: EmoteName; key: number };
  /** Called on any load failure so the caller can show a placeholder. */
  onError: () => void;
};

// ---------------------------------------------------------------------------
// VRM character — load, optimize, face camera, frame, animate, dispose.
// (Accessory attach + skin/hair/eye/cloth recolor live in ./vrmAccessories so
// the World shares the exact same dressing pipeline.)
// ---------------------------------------------------------------------------

function VrmCharacter({
  modelUrl,
  loadout,
  emote,
  onError,
  onReady,
}: {
  modelUrl: string;
  loadout: Loadout3D;
  emote: { name: EmoteName; key: number };
  onError: () => void;
  /** Reports the chest-height Y once the model is framed (camera target). */
  onReady: (targetY: number) => void;
}) {
  const [vrm, setVrm] = useState<VRM | null>(null);

  // Emote clock: restarts whenever emote.key changes.
  const emoteStart = useRef(-10);
  const lastKey = useRef(emote.key);
  const blinkNext = useRef(0);
  const blinkValue = useRef(0);
  // Baseline Y after seating the feet at the ground (preserved across frames so
  // the rest pose does not clobber the load-time vertical placement). Jump /
  // victory arcs are added ON TOP of this baseline, never instead of it.
  const baseY = useRef(0);
  // The wrapper group — gently swayed + used for emote motion (whole-body only).
  const groupRef = useRef<THREE.Group>(null);
  // Idle animation mixer — retargets a .vrma idle to THIS model's normalized
  // rig, so any VRM (T-posed or not) stands naturally. No hand-authored posing.
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  // Live accessory handle (per-frame pet bob / aura spin live in its `animated`).
  const accessoriesRef = useRef<AttachedAccessories | null>(null);
  // Bind-pose head snapshot, captured once at load BEFORE the idle animation
  // poses the model — head accessories (hat/glasses) are placed from this stable
  // reference so a slow GLB load can't leave them floating where the head was.
  const headBindRef = useRef<HeadBind | null>(null);

  // ---- Imperative load (loadAsync is not Suspense-friendly) --------------
  useEffect(() => {
    let alive = true;
    let loaded: VRM | null = null;

    // VRM loader: VRMLoaderPlugin registered so gltf.userData.vrm is populated.
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader
      .loadAsync(modelUrl)
      .then(async (gltf) => {
        if (!alive) return;
        const got = gltf.userData.vrm as VRM | undefined;
        if (!got) {
          onError();
          return;
        }
        loaded = got;

        // Recommended v3 optimizations.
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        // Normalize orientation: for a legacy VRM0 model this rotates
        // `vrm.scene` 180° about Y so its front ends up facing -Z, matching the
        // VRM1 convention. (No-op for VRM1.) IMPORTANT: this writes
        // vrm.scene.rotation.y, so we must NOT overwrite that property below —
        // the camera-facing 180° is applied on the PARENT <group> wrapper in
        // JSX instead, which composes with (rather than clobbers) this result.
        VRMUtils.rotateVRM0(got);

        got.scene.traverse((o) => {
          o.frustumCulled = false;
        });

        // Relax + soften the resting expression if the model supports it.
        got.expressionManager?.setValue("relaxed", 0.35);
        got.expressionManager?.setValue("happy", 0.15);

        // ---- Center + scale so a ~1.5m VRM frames head-to-toe nicely ------
        // Normalize height to ~1.5 units, drop feet onto y=0, center on x/z.
        got.scene.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(got.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const height = size.y > 0.0001 ? size.y : 1.5;
        const scale = 1.5 / height;
        got.scene.scale.setScalar(scale);
        // Re-measure after scaling to seat feet at the ground and center x/z.
        got.scene.updateWorldMatrix(true, true);
        const box2 = new THREE.Box3().setFromObject(got.scene);
        got.scene.position.x -= (box2.min.x + box2.max.x) / 2;
        got.scene.position.z -= (box2.min.z + box2.max.z) / 2;
        got.scene.position.y -= box2.min.y;
        // Remember the seated baseline Y so the per-frame rest pose restores to
        // it (instead of hard-zeroing and losing the foot placement).
        baseY.current = got.scene.position.y;

        // Camera target ~chest height (≈ 60% of the framed, seated height).
        const framedHeight = box2.max.y - box2.min.y;
        onReady((framedHeight > 0.0001 ? framedHeight : 1.5) * 0.6);

        // Snapshot the BIND-pose head reference now — the model is scaled,
        // centered and (for VRM0) already rotateVRM0'd, but the idle mixer has
        // not posed it yet, so the head bone is in its canonical upright rest
        // position. Head accessories are placed from this snapshot regardless of
        // when they load, so they can never lag the bind→idle transition.
        headBindRef.current = captureHeadBind(got);

        // (Accessories are attached in a separate effect so equips update live.)

        // Load + play a shared idle animation (.vrma). createVRMAnimationClip
        // retargets it to THIS model's normalized humanoid, so the character
        // stands naturally regardless of its bind pose / rig. If it fails, the
        // model just keeps its own rest pose.
        try {
          const aLoader = new GLTFLoader();
          aLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
          const aGltf = await aLoader.loadAsync(
            resolveAssetUrl("/assets/avatar/animations/idle_loop.vrma"),
          );
          const vrmAnim = (
            aGltf.userData.vrmAnimations as VRMAnimation[] | undefined
          )?.[0];
          if (vrmAnim && alive) {
            const mixer = new THREE.AnimationMixer(got.scene);
            mixer.clipAction(createVRMAnimationClip(vrmAnim, got)).play();
            mixerRef.current = mixer;
          }
        } catch {
          // No idle animation — the model keeps its natural rest pose.
        }

        if (!alive) return;
        setVrm(got);
      })
      .catch(() => {
        if (alive) onError();
      });

    return () => {
      alive = false;
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      headBindRef.current = null; // drop the stale snapshot until the next load
      if (loaded) VRMUtils.deepDispose(loaded.scene);
      setVrm(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

  // ---- Accessories: attach the equipped props; re-runs on each equip so
  // changes show live. The shared pipeline auto-scales into each model's bone
  // space, anchors head items to the bind-pose snapshot, and overrides the
  // built-in prop with a real .glb when one exists. ------------------------
  useEffect(() => {
    if (!vrm) return;
    const handle = attachAccessories(vrm, loadout, headBindRef.current);
    accessoriesRef.current = handle;
    return () => {
      handle.dispose();
      accessoriesRef.current = null;
    };
    // loadout is read whole; the slot deps below are the equips that matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    vrm,
    loadout.hat,
    loadout.glasses,
    loadout.backpack,
    loadout.handheld,
    loadout.pet,
    loadout.aura,
  ]);

  // ---- Recolor: tint skin / hair / eye / clothing materials to the theme.
  // Geometry can't swap on a fixed VRM, but COLORS can. Shared with the World so
  // both dress identically; changes the clothing COLOUR only — the garment SHAPE
  // is baked mesh and changes only by loading a per-outfit model.
  useEffect(() => {
    if (!vrm) return;
    recolorVrm(vrm, loadout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vrm, loadout.skinTone, loadout.hairColor, loadout.eyeColor, loadout.outfit]);

  // ---- Per-frame: rest pose → active emote, then vrm.update(delta) -------
  useFrame(({ clock }, delta) => {
    if (!vrm) return;

    // The idle .vrma poses the whole body naturally for THIS rig. We layer ONLY
    // whole-body motion (scene position / group rotation) + facial expressions on
    // top for emotes — never touching individual bones — so nothing can look
    // broken on an arbitrary model.
    mixerRef.current?.update(delta);

    if (emote.key !== lastKey.current) {
      lastKey.current = emote.key;
      emoteStart.current = clock.elapsedTime;
    }
    const t = clock.elapsedTime;
    const e = t - emoteStart.current; // seconds into the current emote
    const playing = e >= 0 && e < 1.6;
    const name: EmoteName = playing ? emote.name : "idle";
    const g = groupRef.current;

    let y = baseY.current;
    let z = 0;
    let sway = Math.sin(t * 0.4) * 0.03; // gentle group sway
    let lean = 0;
    let happy = 0.1;
    let relaxed = 0.25;

    if (name === "wave") {
      happy = 0.9;
      lean = Math.sin(e * 9) * 0.08; // friendly side-to-side rock
    } else if (name === "jump") {
      happy = 0.95;
      const k = Math.min(e / 0.45, 1);
      y = baseY.current + Math.sin(k * Math.PI) * 0.4;
      z = -Math.sin(k * Math.PI) * 0.08;
    } else if (name === "victory") {
      happy = 1;
      y = baseY.current + Math.abs(Math.sin(e * 7)) * 0.12; // excited bounce
      sway = Math.sin(e * 9) * 0.12;
    } else if (name === "think") {
      relaxed = 0.7;
      happy = 0.04;
      lean = 0.1; // thoughtful tilt
    }

    vrm.scene.position.y = y;
    vrm.scene.position.z = z;
    if (g) {
      g.rotation.y = sway;
      g.rotation.z = lean;
    }

    // Blink + emote expression, layered over the animation.
    if (t > blinkNext.current) {
      blinkValue.current = 1;
      blinkNext.current = t + 2.4 + Math.random() * 3.5;
    }
    blinkValue.current = Math.max(0, blinkValue.current - delta * 8);
    const em = vrm.expressionManager;
    em?.setValue("blink", blinkValue.current);
    em?.setValue("happy", happy);
    em?.setValue("relaxed", relaxed);

    // Animate pet (bob) + aura (spin) accessories.
    if (accessoriesRef.current) tickAccessories(accessoriesRef.current.animated, t);

    vrm.update(delta);
  });

  if (!vrm) return null;
  // three-vrm orients the model facing +Z (toward our +Z camera); rotateVRM0
  // brings legacy VRM0 models into that same convention — so NO extra yaw is
  // needed. (Adding 180° was verified to show the character's back.) The wrapper
  // group carries only the per-frame idle sway/emote motion set in useFrame.
  return (
    <group ref={groupRef} rotation={[0, 0, 0]}>
      <primitive object={vrm.scene} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Stage — premium, bright, cozy. Soft 3-point-ish lighting, ground + contact
// shadow, gently-clamped orbit. No network HDRI (plain lights only).
// ---------------------------------------------------------------------------

/** Sets the 3D scene background to a 360° environment: a single equirectangular
 * image, or 6 cube faces ([px,nx,py,ny,pz,nz]). Shows `fallbackColor` instantly
 * while the image loads (and if it fails), so the stage is never blank. */
function SceneBackground({
  env,
  fallbackColor,
}: {
  env: string | string[];
  fallbackColor: string;
}) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    let disposed = false;
    let loaded: THREE.Texture | THREE.CubeTexture | null = null;
    // Instant themed colour so there's no blank flash before the image arrives.
    scene.background = new THREE.Color(fallbackColor);
    const apply = (tex: THREE.Texture | THREE.CubeTexture) => {
      if (disposed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      if (!Array.isArray(env)) {
        (tex as THREE.Texture).mapping = THREE.EquirectangularReflectionMapping;
      }
      loaded = tex;
      scene.background = tex;
    };
    if (Array.isArray(env)) {
      new THREE.CubeTextureLoader().load(env, apply, undefined, () => {});
    } else {
      new THREE.TextureLoader().load(env, apply, undefined, () => {});
    }
    return () => {
      disposed = true;
      scene.background = null;
      loaded?.dispose();
    };
  }, [env, fallbackColor, scene]);
  return null;
}

/** A cheap two-stop vertical gradient set as the scene background (sky). */
function gradientTexture(top: string, bottom: string): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function GradientSky({ top, bottom }: { top: string; bottom: string }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const t = gradientTexture(top, bottom);
    scene.background = t;
    return () => {
      scene.background = null;
      t.dispose();
    };
  }, [top, bottom, scene]);
  return null;
}

/** The disc the character stands on, tinted per theme. */
function GroundDisc({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <circleGeometry args={[3.2, 64]} />
      <meshStandardMaterial color={color} roughness={1} metalness={0} />
    </mesh>
  );
}

/** Low-poly stylized tree (trunk + 3 leafy blobs). */
function Tree({
  position,
  scale = 1,
  tint = 0,
}: {
  position: [number, number, number];
  scale?: number;
  tint?: number;
}) {
  const greens = ["#3f9b4f", "#54b85f", "#6cc96f"];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.14, 0.9, 7]} />
        <meshStandardMaterial color="#7a5230" roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.95 + i * 0.3, 0]} castShadow>
          <icosahedronGeometry args={[0.46 - i * 0.09, 0]} />
          <meshStandardMaterial
            color={greens[(i + tint) % 3]}
            roughness={1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

/** A glowing planet (optionally ringed) for the space scene. */
function Planet({
  position,
  radius,
  color,
  ring = false,
}: {
  position: [number, number, number];
  radius: number;
  color: string;
  ring?: boolean;
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[radius, 28, 28]} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      {ring && (
        <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
          <torusGeometry args={[radius * 1.8, radius * 0.1, 12, 60]} />
          <meshStandardMaterial
            color="#e8d6a0"
            emissive="#e8d6a0"
            emissiveIntensity={0.25}
            roughness={0.7}
          />
        </mesh>
      )}
    </group>
  );
}

/** Rising bubbles for the underwater scene (gentle float). */
function Bubbles() {
  const ref = useRef<THREE.Group>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: ((i * 37) % 70) / 10 - 3.5,
        z: -1 - ((i * 53) % 30) / 10,
        r: 0.05 + ((i * 17) % 10) / 100,
        off: (i % 10) / 10,
      })),
    [],
  );
  useFrame((s) => {
    const g = ref.current;
    if (!g) return;
    g.children.forEach((m, i) => {
      const y = ((s.clock.elapsedTime * 0.4 + seeds[i].off) % 1) * 3;
      m.position.y = y;
      (m as THREE.Mesh).scale.setScalar(1 - y / 4);
    });
  });
  return (
    <group ref={ref}>
      {seeds.map((b, i) => (
        <mesh key={i} position={[b.x, 0, b.z]}>
          <sphereGeometry args={[b.r, 10, 10]} />
          <meshStandardMaterial
            color="#bfeaff"
            transparent
            opacity={0.5}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

/** A ring of stone merlons + two towers for the castle scene. */
function Castle() {
  const merlons = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return [Math.cos(a) * 3.1, 0.25, Math.sin(a) * 3.1] as [
      number,
      number,
      number,
    ];
  }).filter(([, , z]) => z < 1.6); // keep the front open
  return (
    <group>
      {merlons.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <boxGeometry args={[0.45, 0.5, 0.3]} />
          <meshStandardMaterial color="#9aa0ad" roughness={1} flatShading />
        </mesh>
      ))}
      {[
        [-2.7, -2.6],
        [2.7, -2.6],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.55, 2.2, 10]} />
            <meshStandardMaterial color="#8b919e" roughness={1} />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <coneGeometry args={[0.62, 0.8, 10]} />
            <meshStandardMaterial color="#b3556b" roughness={1} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Renders the themed 3D environment for the equipped room. */
function RoomScene({
  value,
  env,
  fallbackBg,
}: {
  value: string | null;
  env: string | string[] | null;
  fallbackBg: string;
}) {
  switch (value) {
    case "space":
      return (
        <>
          {env ? (
            <SceneBackground env={env} fallbackColor="#05040f" />
          ) : (
            <GradientSky top="#10103a" bottom="#02010a" />
          )}
          <Planet position={[-2.7, 2.5, -4.5]} radius={0.55} color="#e08a3c" ring />
          <Planet position={[2.7, 3.1, -5.5]} radius={0.42} color="#5b8def" />
          <Planet position={[1.8, 1.4, -3.2]} radius={0.22} color="#cfcfe6" />
          <GroundDisc color="#2a2a44" />
        </>
      );
    case "jungle":
      return (
        <>
          <GradientSky top="#8fd3ff" bottom="#d6f0c2" />
          {(
            [
              [-3.2, -1.4, 1.1, 0],
              [3.3, -1.7, 0.95, 1],
              [-2.5, -3.1, 1.2, 2],
              [2.7, -3.3, 1.05, 0],
              [-3.9, 0.3, 0.9, 1],
              [3.9, 0.2, 1.0, 2],
              [0.2, -4.0, 1.25, 1],
            ] as [number, number, number, number][]
          ).map(([x, z, s, t], i) => (
            <Tree key={i} position={[x, 0, z]} scale={s} tint={t} />
          ))}
          <GroundDisc color="#69b15a" />
        </>
      );
    case "underwater":
      return (
        <>
          <GradientSky top="#3aa0d6" bottom="#08365f" />
          <Bubbles />
          <GroundDisc color="#1d6f9e" />
        </>
      );
    case "castle":
      return (
        <>
          <GradientSky top="#ffd6a0" bottom="#b56a8f" />
          <Castle />
          <GroundDisc color="#8e93a0" />
        </>
      );
    case "cozy":
      return (
        <>
          <GradientSky top="#ffe7c9" bottom="#dcab85" />
          <GroundDisc color="#caa477" />
        </>
      );
    default:
      return (
        <>
          <color attach="background" args={[fallbackBg]} />
          <GroundDisc color="#dfe6f5" />
        </>
      );
  }
}

export default function VRMAvatarViewer({
  modelUrl,
  loadout,
  emote,
  onError,
}: VRMAvatarViewerProps) {
  // Stable callback identity so the loader effect doesn't re-run spuriously.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const handleError = useMemo(() => () => onErrorRef.current(), []);

  const [targetY, setTargetY] = useState(0.9);
  // Subscribe to the catalog so the backdrop recomputes once the public
  // manifest (which carries each room's `env`) finishes loading/merging.
  const manifest = useAvatarManifest();

  // Themed stage colors from the equipped Room. The room's accent is lightened
  // toward white so the backdrop reads as a bright, themed space (space, jungle,
  // underwater…) without darkening the character. No room → the default cozy.
  const stage = useMemo(() => {
    const item = itemById(loadout.room);
    // A 360° environment (equirect URL or 6 cube faces) wins when present.
    const env = item?.env
      ? Array.isArray(item.env)
        ? item.env.map((u) => resolveAssetUrl(u))
        : resolveAssetUrl(item.env)
      : null;
    const value = item?.value ?? null; // space | jungle | underwater | castle | cozy
    const room = item?.color;
    if (!room) return { bg: "#eef2fb", fog: "#eef2fb", env, value };
    const w = new THREE.Color("#ffffff");
    const c = new THREE.Color(room);
    return {
      bg: "#" + c.clone().lerp(w, 0.62).getHexString(),
      fog: "#" + c.clone().lerp(w, 0.4).getHexString(),
      env,
      value,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadout.room, manifest]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.6]} // Chromebook-friendly pixel-ratio clamp.
      camera={{ position: [0, 1.2, 3.0], fov: 32 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      {/* Themed 3D environment for the equipped room (sky + props + ground). */}
      <RoomScene value={stage.value} env={stage.env} fallbackBg={stage.bg} />

      {/* Soft 3-point-ish lighting: ambient base + key + fill + cool rim. */}
      <hemisphereLight args={["#ffffff", "#c9d4ec", 0.9]} />
      <directionalLight
        position={[3.5, 5, 4]}
        intensity={1.5}
        color="#fff6e8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
      />
      <directionalLight position={[-4, 2.5, 2]} intensity={0.45} color="#ffffff" />
      <directionalLight position={[-2, 3, -4]} intensity={0.7} color="#9ec1ff" />

      <VrmCharacter
        modelUrl={modelUrl}
        loadout={loadout}
        emote={emote}
        onError={handleError}
        onReady={setTargetY}
      />

      {/* Grounded contact shadow (the themed ground disc is in RoomScene). */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.45}
        scale={6}
        blur={2.6}
        far={3}
        resolution={512}
      />

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={2.2}
        maxDistance={4.2}
        // Clamp polar so you never see under the feet or over the head.
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.9}
        // Gentle azimuth clamp keeps the friendly front-3/4 framing.
        minAzimuthAngle={-Math.PI / 3}
        maxAzimuthAngle={Math.PI / 3}
        enableDamping
        dampingFactor={0.08}
        target={[0, targetY, 0]}
      />
    </Canvas>
  );
}