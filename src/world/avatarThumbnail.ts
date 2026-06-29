// ---------------------------------------------------------------------------
// avatarThumbnail — render a kid's dressed 3D avatar to a head-and-shoulders PNG
// for use as a lightweight thumbnail (top bar, home cards, parent zone). The
// heavy VRM machinery is only pulled in when an actual render happens, and the
// result is cached (memory + localStorage) so normal app loads just show an
// <img> — no Three.js, no model download. Renders are serialized so we never
// hold more than one WebGL context at a time (Chromebook-friendly).
// ---------------------------------------------------------------------------
import * as THREE from "three";
import { loadAvatar, resolveModelUrl } from "./vrmLoader";
import { itemById } from "../features/avatar/AvatarManifest";
import type { Loadout3D } from "../types";

const SIZE = 160; // render resolution (square, transparent background)

// One render at a time: each render briefly creates a WebGL context + loads a
// VRM, so overlapping them would spike memory and hit the browser's context cap.
let queue: Promise<unknown> = Promise.resolve();

/** Render the kid's dressed avatar to a transparent head-and-shoulders PNG data
 * URL, or null if there's no model / WebGL fails. Serialized behind a queue. */
export function renderAvatarThumbnail(
  kidId: string,
  loadout: Loadout3D,
): Promise<string | null> {
  const run = queue.then(() => doRender(kidId, loadout));
  // Keep the chain alive even if this render rejects, so the next one still runs.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run.catch(() => null);
}

/** Did the render actually draw the avatar? Reads back the framebuffer alpha;
 * a head-and-shoulders shot covers a big fraction of the frame, so a near-empty
 * one (blank / off-frame) is rejected. */
function hasDrawnContent(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const px = new Uint8Array(SIZE * SIZE * 4);
    gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let opaque = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 16) opaque++;
    return opaque > SIZE * SIZE * 0.02; // >2% of pixels drew something
  } catch {
    return true; // can't read back → assume the render is fine
  }
}

async function doRender(
  kidId: string,
  loadout: Loadout3D,
): Promise<string | null> {
  const outfit = itemById(loadout.outfit)?.value;
  const baseAsset = itemById(loadout.base)?.assetPath;
  const url = await resolveModelUrl(kidId, outfit, baseAsset);
  if (!url) return null;

  let loaded: Awaited<ReturnType<typeof loadAvatar>> | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    loaded = await loadAvatar(url, loadout);
    // Equipped accessories (hat/glasses/backpack/pet/aura) attach asynchronously
    // from .glb files; wait for them before the single capture or they'd be
    // missing. Cap the wait so one hung/broken asset can't block the thumbnail.
    await Promise.race([
      loaded.accessoriesReady,
      new Promise<void>((res) => setTimeout(res, 4000)),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true, // transparent background — the chip supplies its own bg
      preserveDrawingBuffer: true, // required to read the pixels back via toDataURL
    });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d4ec, 1.15));
    const key = new THREE.DirectionalLight(0xfff6e8, 1.7);
    key.position.set(2, 3, 3);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xbcd2ff, 0.55);
    fill.position.set(-2.5, 1.5, 2);
    scene.add(fill);
    scene.add(loaded.object);

    // Settle the idle pose so the capture isn't a stiff T-pose.
    loaded.update(0.8, false);

    // Frame head + shoulders. The model is normalized to ~1.6 units tall with
    // feet at y=0 and the face toward +Z, so a +Z camera near head height looks
    // the avatar in the eyes.
    const headY = 1.4;
    const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
    cam.position.set(0, headY, 1.08);
    cam.lookAt(0, headY - 0.04, 0);

    renderer.render(scene, cam);
    // Reject a blank capture (model failed to draw / ended up off-frame) so we
    // never cache an empty image — the caller falls back to the emoji chip.
    if (!hasDrawnContent(renderer)) return null;
    const data = canvas.toDataURL("image/png");
    return data && data.length > 256 ? data : null;
  } catch {
    return null;
  } finally {
    loaded?.dispose();
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
    }
  }
}
