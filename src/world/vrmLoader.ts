// ---------------------------------------------------------------------------
// vrmLoader — load a .vrm into a normalized, idle-animated THREE.Object3D that
// can be dropped into ANY shared scene (the multiplayer World renders several).
//
// This is the reusable core extracted from VRMAvatarViewer's single-character
// loader: GLTFLoader + VRMLoaderPlugin, the recommended v3 optimizations, height
// normalization (feet at y=0, ~1.6 tall, centered on x/z), and the shared idle
// animation retargeted onto this model. The idle .vrma is fetched once and
// re-retargeted per model.
// ---------------------------------------------------------------------------
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import {
  VRMAnimationLoaderPlugin,
  createVRMAnimationClip,
  type VRMAnimation,
} from "@pixiv/three-vrm-animation";
import { resolveAssetUrl } from "../features/avatar/AvatarManifest";

export type LoadedAvatar = {
  vrm: VRM;
  /** Normalized scene: feet on y=0, ~1.6 units tall, centered, facing -Z. */
  object: THREE.Object3D;
  /** Advance idle animation + spring bones. Call every frame. */
  update: (dt: number) => void;
  dispose: () => void;
};

let idlePromise: Promise<VRMAnimation | null> | null = null;
function loadIdleAnimation(): Promise<VRMAnimation | null> {
  if (!idlePromise) {
    idlePromise = (async () => {
      try {
        const loader = new GLTFLoader();
        loader.register((p) => new VRMAnimationLoaderPlugin(p));
        const gltf = await loader.loadAsync(
          resolveAssetUrl("/assets/avatar/animations/idle_loop.vrma"),
        );
        return (
          (gltf.userData.vrmAnimations as VRMAnimation[] | undefined)?.[0] ??
          null
        );
      } catch {
        return null;
      }
    })();
  }
  return idlePromise;
}

export async function loadAvatar(url: string): Promise<LoadedAvatar> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url);
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) throw new Error("Not a VRM model");

  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm); // legacy VRM0 → face -Z like VRM1
  vrm.scene.traverse((o) => {
    o.frustumCulled = false;
  });
  vrm.expressionManager?.setValue("relaxed", 0.3);
  vrm.expressionManager?.setValue("happy", 0.15);

  // Normalize: ~1.6 units tall, feet seated on y=0, centered on x/z.
  vrm.scene.updateWorldMatrix(true, true);
  let box = new THREE.Box3().setFromObject(vrm.scene);
  const size = box.getSize(new THREE.Vector3());
  const height = size.y > 0.0001 ? size.y : 1.5;
  vrm.scene.scale.setScalar(1.6 / height);
  vrm.scene.updateWorldMatrix(true, true);
  box = new THREE.Box3().setFromObject(vrm.scene);
  vrm.scene.position.x -= (box.min.x + box.max.x) / 2;
  vrm.scene.position.z -= (box.min.z + box.max.z) / 2;
  vrm.scene.position.y -= box.min.y;

  let mixer: THREE.AnimationMixer | null = null;
  const idle = await loadIdleAnimation();
  if (idle) {
    mixer = new THREE.AnimationMixer(vrm.scene);
    mixer.clipAction(createVRMAnimationClip(idle, vrm)).play();
  }

  return {
    vrm,
    object: vrm.scene,
    update: (dt: number) => {
      mixer?.update(dt);
      vrm.update(dt);
    },
    dispose: () => {
      mixer?.stopAllAction();
      VRMUtils.deepDispose(vrm.scene);
    },
  };
}

/** First .vrm URL that actually exists for a kid+loadout (HEAD-probed), or null.
 * Mirrors AvatarViewer.modelCandidates so World avatars match the studio. */
export async function resolveModelUrl(
  kidId: string,
  outfitValue: string | undefined,
  baseAssetPath: string | undefined,
): Promise<string | null> {
  const urls: string[] = [];
  if (outfitValue)
    urls.push(resolveAssetUrl(`/assets/avatar/models/${kidId}-${outfitValue}.vrm`));
  if (baseAssetPath) urls.push(resolveAssetUrl(baseAssetPath));
  urls.push(resolveAssetUrl(`/assets/avatar/models/${kidId}-base.vrm`));
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok && !(res.headers.get("content-type") || "").includes("text/html"))
        return url;
    } catch {
      /* try next */
    }
  }
  return null;
}
