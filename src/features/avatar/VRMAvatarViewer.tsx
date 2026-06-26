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
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  VRMLoaderPlugin,
  VRMUtils,
  type VRM,
  type VRMHumanBoneName,
} from "@pixiv/three-vrm";
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
  type VRMAnimation,
} from "@pixiv/three-vrm-animation";
import type { Loadout3D } from "../../types";
import { itemById, resolveAssetUrl } from "./AvatarManifest";
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

// Slots whose equipped item may carry a real .glb accessory to attach, mapped
// to the VRM humanoid bone the prop should ride. Guarded against null bones.
const ACCESSORY_SLOTS: ReadonlyArray<{
  slot: keyof Loadout3D;
  bone: VRMHumanBoneName;
}> = [
  { slot: "hat", bone: "head" },
  { slot: "glasses", bone: "head" },
  { slot: "backpack", bone: "chest" },
  { slot: "handheld", bone: "rightHand" },
  { slot: "pet", bone: "hips" },
];

// ---------------------------------------------------------------------------
// VRM character — load, optimize, face camera, frame, animate, dispose.
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

  // ---- Imperative load (loadAsync is not Suspense-friendly) --------------
  useEffect(() => {
    let alive = true;
    let loaded: VRM | null = null;
    const accessoryRoots: THREE.Object3D[] = [];

    // VRM loader: VRMLoaderPlugin registered so gltf.userData.vrm is populated.
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    // Separate plain loader for accessory .glb files — they are NOT VRMs and
    // must not be run through the VRM parser.
    const accessoryLoader = new GLTFLoader();

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

        // ---- Optional GLB accessories: try-load each, silently skip --------
        for (const { slot, bone } of ACCESSORY_SLOTS) {
          const item = itemById(loadout[slot]);
          const path = item?.assetPath;
          // Only real .glb accessories — never a .vrm (that's a base body).
          if (!path || !/\.glb$/i.test(path)) continue;
          const boneNode = got.humanoid?.getNormalizedBoneNode(bone) ?? null;
          if (!boneNode) continue;
          try {
            const accUrl = resolveAssetUrl(path);
            const accGltf = await accessoryLoader.loadAsync(accUrl);
            if (!alive) {
              // Component unmounted mid-load — dispose the orphan immediately.
              VRMUtils.deepDispose(accGltf.scene);
              return;
            }
            accGltf.scene.traverse((o) => {
              o.frustumCulled = false;
            });
            boneNode.add(accGltf.scene);
            accessoryRoots.push(accGltf.scene);
          } catch {
            // Missing / broken accessory — never substitute primitives.
          }
        }

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
      // Detach + dispose accessories, then the VRM itself.
      for (const root of accessoryRoots) {
        root.parent?.remove(root);
        VRMUtils.deepDispose(root);
      }
      if (loaded) VRMUtils.deepDispose(loaded.scene);
      setVrm(null);
    };
    // loadout is intentionally re-read on modelUrl change; accessory swaps are
    // rare and a full reload keeps bone-attachment lifecycle simple/correct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl]);

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

    vrm.update(delta);
  });

  if (!vrm) return null;
  // three-vrm already orients the model to face +Z (toward our +Z camera), and
  // rotateVRM0 brings legacy VRM0 models into that same convention — so NO extra
  // yaw is needed. (Verified against a real VRM1 model: adding 180° showed the
  // character's back.) Wrapper group kept at identity for future transforms.
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

  return (
    <Canvas
      shadows
      dpr={[1, 1.6]} // Chromebook-friendly pixel-ratio clamp.
      camera={{ position: [0, 1.2, 3.0], fov: 32 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      {/* Bright, cozy backdrop (stage, not character). */}
      <color attach="background" args={["#eef2fb"]} />
      <fog attach="fog" args={["#eef2fb", 7, 14]} />

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

      {/* Soft ground + grounded contact shadow (stage). */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[3, 64]} />
        <meshStandardMaterial color="#dfe6f5" roughness={1} metalness={0} />
      </mesh>
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