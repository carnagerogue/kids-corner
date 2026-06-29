// ---------------------------------------------------------------------------
// vrmAccessories — the shared "dress the VRM" pipeline: attach equipped GLB /
// procedural accessories to a model's bones and recolor its skin / hair / eye /
// clothing materials to the chosen theme.
//
// Extracted from VRMAvatarViewer so BOTH the avatar studio (one close-up
// character) and the multiplayer World (many distant characters) dress a model
// identically — no second, drifting copy of the bind-pose hat placement or the
// luminance-tint recolor. Pure Three.js: no React, no per-instance refs. Recolor
// caches live on `vrm.userData` so re-calling with a cleared pick restores the
// model's defaults.
// ---------------------------------------------------------------------------
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { VRM, VRMHumanBoneName } from "@pixiv/three-vrm";
import type { Loadout3D } from "../../types";
import { itemById, resolveAssetUrl } from "./AvatarManifest";
import {
  ACCESSORY_PLACEMENT,
  buildAccessory,
  disposeAccessory,
  normalizeGlb,
} from "./AvatarAccessories";

// ---------------------------------------------------------------------------
// Head bind-pose snapshot — see captureHeadBind.
// ---------------------------------------------------------------------------
export type HeadBind = {
  matrixWorldInv: THREE.Matrix4;
  pos: THREE.Vector3;
  scale: number;
  top: number;
  front: number; // model's front (+Z) in the bind pose — glasses sit near it
  eyeMid: THREE.Vector3 | null; // eye-bone midpoint if the rig has eye bones
};

export type AccessoryAnim = {
  obj: THREE.Object3D;
  kind: "petBob" | "auraSpin";
  baseY: number;
  amp: number;
};

/** Handle returned by attachAccessories: the per-frame animated props plus a
 * dispose() that removes + frees everything (also cancels any in-flight GLB
 * loads). `animated` is filled as accessories finish attaching, and `ready`
 * resolves once they're all attached (so a one-shot render — e.g. a thumbnail —
 * can wait for them instead of capturing a bare model). */
export type AttachedAccessories = {
  animated: AccessoryAnim[];
  ready: Promise<void>;
  dispose: () => void;
};

// Build a grayscale (luminance) copy of a color texture, brightened so a tint
// multiplied over it reads vividly while dark detail (an eye's pupil, hair
// shadow) stays dark. Returns null if the image can't be read (e.g. not yet
// decoded / cross-origin tainted) — caller then falls back to a flat tint.
function grayscaleColorMap(
  src: THREE.Texture,
  gamma: number,
  lift = 0,
): THREE.Texture | null {
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
      // gamma <1 lifts tones so a tint reads vividly; `lift` remaps into
      // [lift,1] so even a near-black fabric still shows a clear mid-tone.
      const norm = Math.pow(lum / 255, gamma);
      const v = 255 * (lift + (1 - lift) * norm);
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

/**
 * Snapshot the BIND-pose head reference. Call AFTER the model is scaled,
 * centered and (for VRM0) rotateVRM0'd, but BEFORE the idle animation poses it —
 * so the head bone is in its canonical upright rest position. Head accessories
 * (hat/glasses) are placed from this snapshot regardless of when they finish
 * loading, so they can never lag the bind→idle transition or float where the
 * head used to be. Returns null if the rig has no head bone.
 */
export function captureHeadBind(vrm: VRM): HeadBind | null {
  vrm.scene.updateWorldMatrix(true, true);
  const headRaw = vrm.humanoid?.getRawBoneNode("head");
  if (!headRaw) return null;
  headRaw.updateWorldMatrix(true, false);
  const headWorldPos = headRaw.getWorldPosition(new THREE.Vector3());
  // Measure the crown in the SAME (seated) frame as the head bone, clamped to a
  // sane skull height above the head bone so tall hair / an ahoge can't push
  // hats up off the head.
  const seatedBox = new THREE.Box3().setFromObject(vrm.scene);
  // Eye-bone midpoint (if the rig has eye bones) → exact glasses anchor. Rigs
  // without eye bones fall back to a model-front-aware push.
  const lEye = vrm.humanoid?.getRawBoneNode("leftEye");
  const rEye = vrm.humanoid?.getRawBoneNode("rightEye");
  let eyeMid: THREE.Vector3 | null = null;
  if (lEye && rEye) {
    lEye.updateWorldMatrix(true, false);
    rEye.updateWorldMatrix(true, false);
    eyeMid = lEye
      .getWorldPosition(new THREE.Vector3())
      .add(rEye.getWorldPosition(new THREE.Vector3()))
      .multiplyScalar(0.5);
  }
  return {
    matrixWorldInv: headRaw.matrixWorld.clone().invert(),
    pos: headWorldPos,
    scale: headRaw.getWorldScale(new THREE.Vector3()).x || 1,
    top: Math.min(seatedBox.max.y, headWorldPos.y + 0.33),
    front: seatedBox.max.z,
    eyeMid,
  };
}

/**
 * Build + attach the equipped accessories (hat/glasses/backpack/handheld/pet/
 * aura) to the VRM's RAW (rendered) bones, auto-scaling into each model's bone
 * space. A real .glb at the item's assetPath overrides the built-in procedural
 * prop. Returns synchronously with a handle; GLB-backed slots finish attaching
 * asynchronously and populate `handle.animated` as they land. Calling dispose()
 * cancels any in-flight loads and frees everything.
 */
export function attachAccessories(
  vrm: VRM,
  loadout: Loadout3D,
  headBind: HeadBind | null,
): AttachedAccessories {
  let cancelled = false;
  const loader = new GLTFLoader();
  const attached: THREE.Object3D[] = [];
  const animated: AccessoryAnim[] = [];

  const rawBone = (n: VRMHumanBoneName) =>
    vrm.humanoid?.getRawBoneNode(n) ?? null;
  const resolveParent = (b: string): THREE.Object3D | null => {
    if (b === "root") return vrm.scene;
    if (b === "chest")
      return (
        rawBone("chest") ??
        rawBone("upperChest") ??
        rawBone("spine") ??
        rawBone("hips")
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
  // Place a HEAD accessory using the BIND-pose head snapshot: compute the target
  // in the bind-pose world frame, map it to a rigid bone-LOCAL offset via the
  // bind inverse matrix (so it never floats), and stand it upright via the LIVE
  // bone rotation (so a rest head-tilt the idle straightens out doesn't leave the
  // prop visibly tilted).
  const placeBind = (
    obj: THREE.Object3D,
    parent: THREE.Object3D,
    worldTargetBind: THREE.Vector3,
    hb: HeadBind,
  ): number => {
    obj.scale.setScalar(1 / hb.scale);
    obj.position.copy(worldTargetBind.clone().applyMatrix4(hb.matrixWorldInv));
    parent.updateWorldMatrix(true, false);
    const pq = new THREE.Quaternion();
    parent.getWorldQuaternion(pq);
    obj.quaternion.copy(pq.invert()); // stand upright in the current pose
    obj.traverse((o) => (o.frustumCulled = false));
    parent.add(obj);
    return hb.scale;
  };

  const hb = headBind;

  const attachPromise = (async () => {
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

      let s: number;
      if (slot === "hat" && hb) {
        // Sink the hat onto the head by a fraction of its OWN height so the head
        // goes inside it instead of the whole hat perching on top.
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
        // Prefer the exact eye-bone midpoint nudged to the lens plane; rigs
        // without eye bones estimate the face front from head depth (capped at
        // the model front so glasses neither sink in nor stick out).
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
        animated.push({
          obj,
          kind: p.animate,
          baseY: obj.position.y,
          amp: 0.025 / s,
        });
      }
    }
  })();
  // Never rejects — every slot is guarded — so a one-shot renderer can await it.
  const ready = attachPromise.then(
    () => undefined,
    () => undefined,
  );

  return {
    animated,
    ready,
    dispose: () => {
      cancelled = true;
      animated.length = 0;
      for (const o of attached) {
        o.parent?.remove(o);
        disposeAccessory(o);
      }
      attached.length = 0;
    },
  };
}

/** Per-frame: bob pets, spin auras. `t` is elapsed seconds. */
export function tickAccessories(animated: AccessoryAnim[], t: number): void {
  for (const a of animated) {
    if (a.kind === "petBob") a.obj.position.y = a.baseY + Math.sin(t * 3) * a.amp;
    else a.obj.rotation.y = t * 0.7;
  }
}

// ---------------------------------------------------------------------------
// Recolor — tint skin / hair / eye / clothing materials to the chosen theme.
// Caches each material's original color/map/emissive on vrm.userData so clearing
// a pick restores the model default; skin + clothes multiply over the texture,
// hair + eyes use a grayscale repaint for fully vivid color. Changes COLOUR
// only — the garment SHAPE is baked mesh (swap by loading a per-outfit model).
// ---------------------------------------------------------------------------
type RecolorCaches = {
  origColors: WeakMap<THREE.Material, THREE.Color>;
  origMaps: WeakMap<THREE.Material, THREE.Texture | null>;
  grayMaps: WeakMap<THREE.Material, THREE.Texture | null>;
  origEmissive: WeakMap<THREE.Material, THREE.Color>;
};

function recolorCaches(vrm: VRM): RecolorCaches {
  // Store on the scene's userData (the VRM object itself has no userData), so
  // re-calling recolor with a cleared pick can restore each material's default.
  const ud = vrm.scene.userData as { __recolor?: RecolorCaches };
  if (!ud.__recolor) {
    ud.__recolor = {
      origColors: new WeakMap(),
      origMaps: new WeakMap(),
      grayMaps: new WeakMap(),
      origEmissive: new WeakMap(),
    };
  }
  return ud.__recolor;
}

export function recolorVrm(vrm: VRM, loadout: Loadout3D): void {
  const caches = recolorCaches(vrm);
  const pick = (slot: keyof Loadout3D) => itemById(loadout[slot])?.color;
  const want = {
    eye: pick("eyeColor"),
    hair: pick("hairColor"),
    skin: pick("skinTone"),
    cloth: pick("outfit"), // recolor the worn clothes to the outfit's theme
  };
  vrm.scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.Material & {
        color?: THREE.Color;
        map?: THREE.Texture | null;
        emissive?: THREE.Color;
      };
      if (!mat?.color) continue;
      const name = (mat.name || "").toLowerCase();
      // Order matters — a material matches the FIRST category. eye/hair/skin
      // before cloth so e.g. "body" stays skin.
      const cat: keyof typeof want | null = /iris|^eye$/.test(name)
        ? "eye"
        : /hair/.test(name)
          ? "hair"
          : /skin|body/.test(name)
            ? "skin"
            : /cloth|wear|huku|tops|bottom|shirt|skirt|dress|jacket|coat|hood|pant|suit/.test(
                  name,
                )
              ? "cloth"
              : null;
      if (!cat) continue;
      if (!caches.origColors.has(mat)) {
        caches.origColors.set(mat, mat.color.clone());
        caches.origMaps.set(mat, mat.map ?? null);
      }
      const tint = want[cat];
      // HAIR + EYES + CLOTH recolor vividly by swapping their base texture for a
      // grayscale (luminance) copy and tinting that; SKIN keeps its texture and
      // tints over it for natural shading.
      const useGray = cat === "hair" || cat === "eye" || cat === "cloth";
      if (cat === "eye" && mat.emissive && !caches.origEmissive.has(mat)) {
        caches.origEmissive.set(mat, mat.emissive.clone());
      }
      if (tint) {
        mat.color.set(tint);
        if (useGray) {
          let gray = caches.grayMaps.get(mat);
          if (gray === undefined) {
            const om = caches.origMaps.get(mat) ?? null;
            // Eyes + clothes brighten harder (lower gamma); cloth gets a
            // brightness floor so dark garments still take the colour boldly.
            gray = om
              ? grayscaleColorMap(
                  om,
                  cat === "eye" || cat === "cloth" ? 0.4 : 0.6,
                  cat === "cloth" ? 0.5 : 0,
                )
              : null;
            caches.grayMaps.set(mat, gray); // cache (null = no/failed map)
          }
          if (gray && mat.map !== gray) {
            mat.map = gray;
            mat.needsUpdate = true;
          }
        }
        // Eyes also get a gentle self-glow in the chosen colour so it pops.
        if (cat === "eye" && mat.emissive) {
          mat.emissive.set(tint).multiplyScalar(0.45);
        }
      } else {
        mat.color.copy(caches.origColors.get(mat)!);
        if (useGray) {
          const om = caches.origMaps.get(mat) ?? null;
          if (mat.map !== om) {
            mat.map = om;
            mat.needsUpdate = true;
          }
        }
        if (cat === "eye" && mat.emissive) {
          const oe = caches.origEmissive.get(mat);
          if (oe) mat.emissive.copy(oe);
        }
      }
    }
  });
}
