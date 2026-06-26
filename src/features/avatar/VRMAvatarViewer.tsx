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

        if (!alive) return;
        setVrm(got);
      })
      .catch(() => {
        if (alive) onError();
      });

    return () => {
      alive = false;
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
    const humanoid = vrm.humanoid;

    if (emote.key !== lastKey.current) {
      lastKey.current = emote.key;
      emoteStart.current = clock.elapsedTime;
    }
    const t = clock.elapsedTime;
    const e = t - emoteStart.current; // seconds into the current emote
    const playing = e >= 0 && e < 1.6;
    const name: EmoteName = playing ? emote.name : "idle";

    const rUpper = humanoid?.getNormalizedBoneNode("rightUpperArm") ?? null;
    const rLower = humanoid?.getNormalizedBoneNode("rightLowerArm") ?? null;
    const lUpper = humanoid?.getNormalizedBoneNode("leftUpperArm") ?? null;
    const lLower = humanoid?.getNormalizedBoneNode("leftLowerArm") ?? null;
    const head = humanoid?.getNormalizedBoneNode("head") ?? null;
    const spine = humanoid?.getNormalizedBoneNode("spine") ?? null;

    // --- Rest pose (re-applied every frame so transitions are clean) -------
    // Lower the upper arms from the T-pose down to a relaxed rest by the side.
    // +Z rotation on the LEFT upper arm and -Z on the RIGHT brings both down.
    if (lUpper) lUpper.rotation.set(0, 0, 1.2);
    if (rUpper) rUpper.rotation.set(0, 0, -1.2);
    if (lLower) lLower.rotation.set(0, 0, 0.1);
    if (rLower) rLower.rotation.set(0, 0, -0.1);
    if (head) head.rotation.set(0, 0, 0);
    if (spine) spine.rotation.set(0, 0, 0);
    // Restore the seated baseline (NOT 0) so foot placement is preserved; emote
    // arcs below add their offset on top of this.
    vrm.scene.position.y = baseY.current;

    // Gentle, always-on breathing + head sway.
    const breathe = Math.sin(t * 1.6) * 0.03;
    if (spine) spine.rotation.x += breathe;
    if (head) {
      head.rotation.y += Math.sin(t * 0.8) * 0.08;
      head.rotation.x += breathe * 0.5;
    }

    // --- Active emote -------------------------------------------------------
    if (name === "wave") {
      // Raise the right upper arm out + up, bend the elbow, oscillate forearm.
      if (rUpper) rUpper.rotation.set(0, 0, -2.5);
      if (rLower) rLower.rotation.set(0, 0, -0.6 + Math.sin(e * 14) * 0.5);
    } else if (name === "jump") {
      // Arc up and slightly back, arms up.
      const k = Math.min(e / 0.5, 1);
      vrm.scene.position.y = baseY.current + Math.sin(k * Math.PI) * 0.45;
      vrm.scene.position.z = -Math.sin(k * Math.PI) * 0.12;
      if (lUpper) lUpper.rotation.set(0, 0, 2.4);
      if (rUpper) rUpper.rotation.set(0, 0, -2.4);
    } else if (name === "victory") {
      // Both arms raised in a cheer with a little bounce.
      if (lUpper) lUpper.rotation.set(0, 0, 2.6);
      if (rUpper) rUpper.rotation.set(0, 0, -2.6);
      if (lLower) lLower.rotation.set(0, 0, 0.4);
      if (rLower) rLower.rotation.set(0, 0, -0.4);
      vrm.scene.position.y = baseY.current + Math.abs(Math.sin(e * 6)) * 0.06;
    } else if (name === "think") {
      // Right hand toward chin (bend arm up), slight head tilt.
      if (rUpper) rUpper.rotation.set(0.1, 0, -0.8);
      if (rLower) rLower.rotation.set(0, -1.4, -1.4);
      if (head) head.rotation.z += 0.18;
    } else {
      // idle: leave the rest pose + breathing as-is, with the occasional blink.
      if (t > blinkNext.current) {
        blinkValue.current = 1;
        blinkNext.current = t + 2.5 + Math.random() * 3.5;
      }
      blinkValue.current = Math.max(0, blinkValue.current - delta * 8);
      vrm.expressionManager?.setValue("blink", blinkValue.current);
    }

    // Reset z-offset outside of jump so it doesn't drift.
    if (name !== "jump") vrm.scene.position.z = 0;

    vrm.update(delta);
  });

  if (!vrm) return null;
  // Camera sits on +Z looking toward the origin. After rotateVRM0 every model's
  // front faces -Z (its back toward +Z), so wrap in a group yawed 180° to turn
  // the front toward the camera. Applying the yaw HERE (on the parent group)
  // rather than on vrm.scene.rotation keeps the rotateVRM0 normalization intact.
  return (
    <group rotation={[0, Math.PI, 0]}>
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