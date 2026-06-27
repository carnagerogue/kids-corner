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
import {
  ACCESSORY_PLACEMENT,
  buildAccessory,
  disposeAccessory,
  normalizeGlb,
} from "./AvatarAccessories";
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

// Build a grayscale (luminance) copy of a color texture, brightened so a tint
// multiplied over it reads vividly while dark detail (an eye's pupil, hair
// shadow) stays dark. Returns null if the image can't be read (e.g. not yet
// decoded / cross-origin tainted) — caller then falls back to a flat tint.
function grayscaleColorMap(src: THREE.Texture): THREE.Texture | null {
  const img = src.image as
    | HTMLImageElement
    | ImageBitmap
    | HTMLCanvasElement
    | undefined;
  if (!img || !("width" in img) || !img.width || !img.height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(img as CanvasImageSource, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      // gamma <1 lifts mid/iris tones (vivid) but keeps the darkest (pupil) dark
      const v = 255 * Math.pow(lum / 255, 0.6);
      px[i] = px[i + 1] = px[i + 2] = v; // keep alpha at px[i+3]
    }
    ctx.putImageData(data, 0, 0);
  } catch {
    return null;
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = src.flipY;
  tex.colorSpace = src.colorSpace;
  tex.wrapS = src.wrapS;
  tex.wrapT = src.wrapT;
  tex.repeat.copy(src.repeat);
  tex.offset.copy(src.offset);
  tex.needsUpdate = true;
  return tex;
}

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
  // Accessories needing per-frame motion (pet bob / aura spin).
  const accessoryAnimRef = useRef<
    { obj: THREE.Object3D; kind: "petBob" | "auraSpin"; baseY: number; amp: number }[]
  >([]);
  // Bind-pose head snapshot, captured once at load BEFORE the idle animation
  // poses the model. Head accessories (hat/glasses) are placed from THIS stable
  // reference — never the live, animating bone — so a slow GLB load can't leave
  // them floating where the head used to be. `matrixWorldInv` maps a bind-pose
  // world point into the head bone's local frame, giving a rigid local offset
  // that stays glued to the head in every animation pose.
  const headBindRef = useRef<{
    matrixWorldInv: THREE.Matrix4;
    pos: THREE.Vector3;
    scale: number;
    top: number;
    front: number; // model's front (+Z) in the bind pose — glasses sit near it
    eyeMid: THREE.Vector3 | null; // eye-bone midpoint if the rig has eye bones
  } | null>(null);
  // Original material colors + base textures, so skin/hair/eye recolor can be
  // restored to the model's defaults. WeakMaps → entries vanish when a
  // swapped-out model's materials are GC'd.
  const origColorsRef = useRef(new WeakMap<THREE.Material, THREE.Color>());
  const origMapsRef = useRef(new WeakMap<THREE.Material, THREE.Texture | null>());
  // Cached grayscale (luminance) version of a hair/eye material's base texture,
  // so a chosen color shows vividly (color × luminance) while the texture's
  // light/dark detail — hair strands, the eye's pupil — is preserved.
  const grayMapsRef = useRef(new WeakMap<THREE.Material, THREE.Texture | null>());

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
        got.scene.updateWorldMatrix(true, true);
        const headRaw = got.humanoid?.getRawBoneNode("head");
        if (headRaw) {
          headRaw.updateWorldMatrix(true, false);
          const headWorldPos = headRaw.getWorldPosition(new THREE.Vector3());
          // Measure the crown in the SAME (seated) frame as the head bone. Crown
          // = top of the model, but clamped to a sane skull height above the head
          // bone so a tall hair mesh / ahoge on a user-supplied model can't push
          // hats up off the head. For the three bundled rigs the cap never bites
          // (their box top sits only ~0.21–0.23 above the head bone = the skull).
          const seatedBox = new THREE.Box3().setFromObject(got.scene);
          // Eye-bone midpoint (if the rig has eye bones) → exact glasses anchor,
          // free of the chest/face-depth confound. Seed-san rigs lack eye bones,
          // so those fall back to a model-front-aware push.
          const lEye = got.humanoid?.getRawBoneNode("leftEye");
          const rEye = got.humanoid?.getRawBoneNode("rightEye");
          let eyeMid: THREE.Vector3 | null = null;
          if (lEye && rEye) {
            lEye.updateWorldMatrix(true, false);
            rEye.updateWorldMatrix(true, false);
            eyeMid = lEye
              .getWorldPosition(new THREE.Vector3())
              .add(rEye.getWorldPosition(new THREE.Vector3()))
              .multiplyScalar(0.5);
          }
          headBindRef.current = {
            matrixWorldInv: headRaw.matrixWorld.clone().invert(),
            pos: headWorldPos,
            scale: headRaw.getWorldScale(new THREE.Vector3()).x || 1,
            top: Math.min(seatedBox.max.y, headWorldPos.y + 0.33),
            front: seatedBox.max.z,
            eyeMid,
          };
        } else {
          headBindRef.current = null;
        }

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

  // ---- Accessories: build + attach equipped props; re-runs on every equip so
  // changes show live. Uses RAW bones (the rendered/animated skeleton) and
  // auto-scales into each model's bone space. A real .glb at the item's
  // assetPath overrides the built-in procedural prop. ----------------------
  useEffect(() => {
    if (!vrm) return;
    const v = vrm;
    let cancelled = false;
    const loader = new GLTFLoader();
    const attached: THREE.Object3D[] = [];
    const animated: typeof accessoryAnimRef.current = [];

    const rawBone = (n: VRMHumanBoneName) => v.humanoid?.getRawBoneNode(n) ?? null;
    const resolveParent = (b: string): THREE.Object3D | null => {
      if (b === "root") return v.scene;
      if (b === "chest")
        return (
          rawBone("chest") ?? rawBone("upperChest") ?? rawBone("spine") ?? rawBone("hips")
        );
      if (b === "spine") return rawBone("spine") ?? rawBone("hips");
      return rawBone(b as VRMHumanBoneName);
    };
    const place = (
      obj: THREE.Object3D,
      parent: THREE.Object3D,
      offset: [number, number, number],
      rotation?: [number, number, number],
    ): number => {
      parent.updateWorldMatrix(true, false);
      const ws = new THREE.Vector3();
      parent.getWorldScale(ws);
      const s = ws.x || 1; // bone world scale → keep props at real-world size
      obj.scale.setScalar(1 / s);
      obj.position.set(offset[0] / s, offset[1] / s, offset[2] / s);
      if (rotation) obj.rotation.set(rotation[0], rotation[1], rotation[2]);
      obj.traverse((o) => (o.frustumCulled = false));
      parent.add(obj);
      return s;
    };
    // Place a HEAD accessory using the BIND-pose head snapshot. Raw bone local
    // axes are arbitrary per rig (a head bone's local "up" rarely points
    // world-up), so a fixed local offset lands unpredictably — that was the
    // hat-over-the-face bug. And localizing a world target against the LIVE bone
    // matrix races the idle animation, leaving props floating where the head
    // *was* — that was the floating bug. So we compute the target in the model's
    // bind-pose world frame, map it to a rigid bone-LOCAL offset via the bind
    // inverse matrix, and stand it upright via the bind rotation. The offset is
    // constant in bone-local space, so `boneMatrixWorld(anyPose) · offset` is the
    // crown in that pose — the prop stays glued to the head in every frame, no
    // matter when it loads. `hb` is the head bind snapshot; `parent` is the live
    // bone the prop rides.
    const placeBind = (
      obj: THREE.Object3D,
      parent: THREE.Object3D,
      worldTargetBind: THREE.Vector3,
      hb: NonNullable<typeof headBindRef.current>,
    ): number => {
      // POSITION comes from the BIND snapshot → a rigid bone-local offset that
      // can never float (the whole point of this fix). Assumes ~uniform bone
      // scale (true for these rigs); `1/hb.scale` undoes the bone's world scale
      // so the prop renders at its normalized real-world size.
      obj.scale.setScalar(1 / hb.scale);
      obj.position.copy(worldTargetBind.clone().applyMatrix4(hb.matrixWorldInv));
      // ORIENTATION reads the LIVE (settled idle) bone, not the bind pose: some
      // rigs carry a rest head-tilt that the idle straightens out (Seed-san has a
      // ~9° bind pitch), so freezing upright at bind would leave the prop visibly
      // tilted. A small orientation error never detaches the prop, so it's safe
      // to read the live bone here even though position must not.
      parent.updateWorldMatrix(true, false);
      const pq = new THREE.Quaternion();
      parent.getWorldQuaternion(pq);
      obj.quaternion.copy(pq.invert()); // stand upright in the current pose
      obj.traverse((o) => (o.frustumCulled = false));
      parent.add(obj);
      return hb.scale;
    };

    // Stable bind-pose head reference (captured at load, before the idle pose).
    const hb = headBindRef.current;

    (async () => {
      const slots = ["hat", "glasses", "backpack", "handheld", "pet", "aura"] as const;
      for (const slot of slots) {
        if (cancelled) break;
        const item = itemById(loadout[slot]);
        if (!item) continue;
        const p = ACCESSORY_PLACEMENT[slot];
        const parent = resolveParent(p.bone);
        if (!parent) continue;

        let obj: THREE.Object3D | null = null;
        if (item.assetPath && /\.glb$/i.test(item.assetPath)) {
          try {
            const g = await loader.loadAsync(resolveAssetUrl(item.assetPath));
            if (cancelled) {
              disposeAccessory(g.scene);
              return;
            }
            // Real asset: normalize its arbitrary size/origin to fit this slot.
            obj = normalizeGlb(g.scene, slot);
          } catch {
            // missing/broken .glb → fall back to the built-in prop
          }
        }
        if (!obj) obj = buildAccessory(slot, item.value ?? "", item.color);
        if (!obj || cancelled) continue;

        // Head items (hat/glasses) anchor to the stable bind-pose head snapshot
        // (immune to the idle pose); everything else rides its bone with the
        // authored local offset (works well off-head). If the head snapshot is
        // unavailable (no head bone), head items fall back to the bone offset.
        let s: number;
        if (slot === "hat" && hb) {
          // Sink the hat onto the head by a fraction of its OWN height so the
          // head goes inside it (a cap to the forehead, a tall hat's brim to the
          // crown) instead of the whole hat perching on top. normalizeGlb anchors
          // the hat base at y=0, so its local box height is the rendered height.
          obj.updateMatrixWorld(true);
          const hatH = new THREE.Box3().setFromObject(obj).max.y || 0.1;
          const sink = THREE.MathUtils.clamp(hatH * 0.7, 0.05, 0.16);
          s = placeBind(
            obj,
            parent,
            new THREE.Vector3(hb.pos.x, hb.top - sink, hb.pos.z),
            hb,
          );
        } else if (slot === "glasses" && hb) {
          // Prefer the exact eye-bone midpoint (just nudged forward to the lens
          // plane). Rigs without eye bones fall back to eye height + a push
          // toward the model front so glasses don't sink inside a deeper face
          // (clamped so a shallow face doesn't float them off).
          // Eye-bone rigs: exact. Otherwise estimate the FACE front from head
          // depth (≈ half the head's vertical size in front of the head bone) —
          // the whole-model front overshoots past the face (chest/hair), making
          // glasses stick out. Cap at the model front as a safety net.
          const faceZ = Math.min(
            hb.pos.z + THREE.MathUtils.clamp((hb.top - hb.pos.y) * 0.33, 0.07, 0.105),
            hb.front - 0.04,
          );
          const target = hb.eyeMid
            ? new THREE.Vector3(hb.eyeMid.x, hb.eyeMid.y, hb.eyeMid.z + 0.03)
            : new THREE.Vector3(hb.pos.x, hb.top - 0.15, faceZ);
          s = placeBind(obj, parent, target, hb);
        } else {
          s = place(obj, parent, p.offset, p.rotation);
        }
        attached.push(obj);
        if (p.animate) {
          animated.push({ obj, kind: p.animate, baseY: obj.position.y, amp: 0.025 / s });
        }
      }
      if (!cancelled) accessoryAnimRef.current = animated;
    })();

    return () => {
      cancelled = true;
      accessoryAnimRef.current = [];
      for (const o of attached) {
        o.parent?.remove(o);
        disposeAccessory(o);
      }
    };
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

  // ---- Recolor: tint the model's skin / hair / eye materials -------------
  // Geometry can't swap on a fixed VRM, but COLORS can: VRoid + most rigs name
  // their materials (…_SKIN / _HAIR / EyeIris…, or body / hair / eye), so we
  // recolor those by name. We remember each material's original color and either
  // apply the chosen tint or restore the default. (Tint multiplies the base
  // texture, so it shifts the existing color rather than fully repainting it —
  // great for skin tones, a softer shift for vivid hair colors.)
  useEffect(() => {
    if (!vrm) return;
    const pick = (slot: keyof Loadout3D) => itemById(loadout[slot])?.color;
    const want = { eye: pick("eyeColor"), hair: pick("hairColor"), skin: pick("skinTone") };
    vrm.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const mat = m as THREE.Material & { color?: THREE.Color; map?: THREE.Texture | null };
        if (!mat?.color) continue;
        const name = (mat.name || "").toLowerCase();
        const cat: keyof typeof want | null = /iris|^eye$/.test(name)
          ? "eye"
          : /hair/.test(name)
            ? "hair"
            : /skin|body/.test(name)
              ? "skin"
              : null;
        if (!cat) continue;
        if (!origColorsRef.current.has(mat)) {
          origColorsRef.current.set(mat, mat.color.clone());
          origMapsRef.current.set(mat, mat.map ?? null);
        }
        const tint = want[cat];
        // HAIR + EYES recolor vividly by swapping their base texture for a
        // grayscale (luminance) copy and tinting that: color × luminance shows
        // the picked color fully while keeping detail — hair strands, and
        // crucially the eye's dark pupil (a plain multiply muddies vivid colors;
        // dropping the texture entirely would erase the pupil). SKIN keeps its
        // texture and tints over it for natural shading.
        const useGray = cat === "hair" || cat === "eye";
        if (tint) {
          mat.color.set(tint);
          if (useGray) {
            let gray = grayMapsRef.current.get(mat);
            if (gray === undefined) {
              const om = origMapsRef.current.get(mat) ?? null;
              gray = om ? grayscaleColorMap(om) : null;
              grayMapsRef.current.set(mat, gray); // cache (null = no/failed map)
            }
            if (gray && mat.map !== gray) {
              mat.map = gray;
              mat.needsUpdate = true;
            }
          }
        } else {
          mat.color.copy(origColorsRef.current.get(mat)!);
          if (useGray) {
            const om = origMapsRef.current.get(mat) ?? null;
            if (mat.map !== om) {
              mat.map = om;
              mat.needsUpdate = true;
            }
          }
        }
      }
    });
  }, [vrm, loadout.skinTone, loadout.hairColor, loadout.eyeColor]);

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
    for (const a of accessoryAnimRef.current) {
      if (a.kind === "petBob") a.obj.position.y = a.baseY + Math.sin(t * 3) * a.amp;
      else a.obj.rotation.y = t * 0.7;
    }

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

  // Themed stage colors from the equipped Room. The room's accent is lightened
  // toward white so the backdrop reads as a bright, themed space (space, jungle,
  // underwater…) without darkening the character. No room → the default cozy.
  const stage = useMemo(() => {
    const room = itemById(loadout.room)?.color;
    if (!room) return { bg: "#eef2fb", fog: "#eef2fb" };
    const w = new THREE.Color("#ffffff");
    const c = new THREE.Color(room);
    return {
      bg: "#" + c.clone().lerp(w, 0.62).getHexString(),
      fog: "#" + c.clone().lerp(w, 0.4).getHexString(),
    };
  }, [loadout.room]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.6]} // Chromebook-friendly pixel-ratio clamp.
      camera={{ position: [0, 1.2, 3.0], fov: 32 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      {/* Bright, themed backdrop (stage, not character). */}
      <color attach="background" args={[stage.bg]} />
      <fog attach="fog" args={[stage.fog, 7, 14]} />

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