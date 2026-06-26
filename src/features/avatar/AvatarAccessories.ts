// ---------------------------------------------------------------------------
// AvatarAccessories — clean procedural accessory props attached to a VRM's
// bones. These are simple PROPS (hats, glasses, packs, pets…), not the
// character, so they show on ANY loaded model with zero extra assets and
// auto-fit via the model's head size. A real .glb at the item's assetPath
// overrides the procedural prop (see VRMAvatarViewer).
//
// Geometry is authored at real-world sizes for a ~1.5-unit-tall model and with
// its origin at the bone's attach point; VRMAvatarViewer scales it into each
// model's bone space.
// ---------------------------------------------------------------------------
import * as THREE from "three";

function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...opts });
}
function mesh(geo: THREE.BufferGeometry, material: THREE.Material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  return m;
}

/** Which bone each accessory slot rides, and how it's framed. */
export type AccessoryPlacement = {
  bone:
    | "head"
    | "chest"
    | "spine"
    | "rightHand"
    | "hips"
    | "root";
  /** Local offset (world units, for a ~1.5-tall model) from the bone origin. */
  offset: [number, number, number];
  /** Extra Euler rotation (radians). */
  rotation?: [number, number, number];
  /** Per-frame motion kind, if any. */
  animate?: "petBob" | "auraSpin";
};

export const ACCESSORY_PLACEMENT: Record<string, AccessoryPlacement> = {
  hat: { bone: "head", offset: [0, 0.21, 0.0] },
  glasses: { bone: "head", offset: [0, 0.09, 0.085] },
  backpack: { bone: "chest", offset: [0, 0.02, -0.11] },
  handheld: { bone: "rightHand", offset: [0, -0.03, 0.0] },
  pet: { bone: "root", offset: [0.42, 0.12, 0.18], animate: "petBob" },
  aura: { bone: "root", offset: [0, 0.78, 0], animate: "auraSpin" },
};

// --- per-type builders ------------------------------------------------------

function buildHat(value: string, color: string): THREE.Group {
  const g = new THREE.Group();
  const c = mat(color);
  if (value === "wizard") {
    const cone = mesh(new THREE.ConeGeometry(0.13, 0.34, 24), c);
    cone.position.y = 0.17;
    const brim = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24), c);
    g.add(cone, brim);
    const star = mesh(new THREE.IcosahedronGeometry(0.025, 0), mat("#ffe08a", { emissive: "#7a5a00", metalness: 0.4 }));
    star.position.set(0, 0.22, 0.1);
    g.add(star);
  } else if (value === "crown") {
    const band = mesh(new THREE.CylinderGeometry(0.135, 0.145, 0.07, 24), mat(color, { metalness: 0.8, roughness: 0.25 }));
    band.position.y = 0.04;
    g.add(band);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spike = mesh(new THREE.ConeGeometry(0.025, 0.07, 8), mat(color, { metalness: 0.8, roughness: 0.25 }));
      spike.position.set(Math.cos(a) * 0.135, 0.1, Math.sin(a) * 0.135);
      g.add(spike);
    }
  } else if (value === "party") {
    const cone = mesh(new THREE.ConeGeometry(0.11, 0.3, 20), c);
    cone.position.y = 0.15;
    g.add(cone);
    const pom = mesh(new THREE.SphereGeometry(0.04, 12, 12), mat("#fff2a8"));
    pom.position.y = 0.31;
    g.add(pom);
  } else {
    // beanie / cap / explorer — a soft dome, with a visor/brim for cap & explorer
    const dome = mesh(new THREE.SphereGeometry(0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), c);
    dome.position.y = 0.02;
    g.add(dome);
    if (value === "cap") {
      const visor = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.015, 24, 1, false, 0, Math.PI), c);
      visor.position.set(0, 0.0, 0.12);
      visor.rotation.x = -0.12;
      g.add(visor);
    } else if (value === "explorer") {
      const brim = mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 28), mat(color, { roughness: 0.8 }));
      g.add(brim);
    } else {
      // beanie cuff
      const cuff = mesh(new THREE.TorusGeometry(0.155, 0.025, 12, 28), mat(color, { roughness: 0.85 }));
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.01;
      g.add(cuff);
    }
  }
  return g;
}

function buildGlasses(value: string, color: string): THREE.Group {
  const g = new THREE.Group();
  const dark = value === "shades" || value === "goggles";
  const frameCol = dark ? "#1b1b1b" : color;
  const frame = mat(frameCol, { metalness: 0.3, roughness: 0.4 });
  const lensMat = dark
    ? mat("#101418", { metalness: 0.5, roughness: 0.15 })
    : new THREE.MeshStandardMaterial({ color: "#bfe9ff", transparent: true, opacity: 0.35, roughness: 0.1 });
  for (const x of [-0.07, 0.07]) {
    const rim = mesh(new THREE.TorusGeometry(0.05, 0.012, 10, 24), frame);
    rim.position.set(x, 0, 0);
    const lens = mesh(new THREE.CircleGeometry(0.048, 24), lensMat);
    lens.position.set(x, 0, 0.001);
    g.add(rim, lens);
  }
  const bridge = mesh(new THREE.BoxGeometry(0.04, 0.012, 0.012), frame);
  g.add(bridge);
  return g;
}

function buildBackpack(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(0.22, 0.27, 0.11), mat(color));
  (body.geometry as THREE.BoxGeometry).computeVertexNormals();
  g.add(body);
  const pocket = mesh(new THREE.BoxGeometry(0.16, 0.1, 0.05), mat(color, { roughness: 0.7 }));
  pocket.position.set(0, -0.05, -0.07);
  g.add(pocket);
  for (const x of [-0.07, 0.07]) {
    const strap = mesh(new THREE.BoxGeometry(0.03, 0.26, 0.02), mat(color, { roughness: 0.8 }));
    strap.position.set(x, 0, 0.075);
    g.add(strap);
  }
  return g;
}

function buildHandheld(value: string, color: string): THREE.Group {
  const g = new THREE.Group();
  if (value === "book") {
    const cover = mesh(new THREE.BoxGeometry(0.12, 0.16, 0.03), mat(color));
    const pages = mesh(new THREE.BoxGeometry(0.1, 0.14, 0.025), mat("#fdf6e3"));
    pages.position.z = 0.004;
    g.add(cover, pages);
  } else if (value === "wand") {
    const stick = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8), mat("#6b4a2b"));
    const star = mesh(new THREE.IcosahedronGeometry(0.035, 0), mat(color, { emissive: color, emissiveIntensity: 0.4 }));
    star.position.y = 0.12;
    g.add(stick, star);
  } else if (value === "telescope") {
    const tube = mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.2, 16), mat(color, { metalness: 0.4 }));
    tube.rotation.z = Math.PI / 2;
    g.add(tube);
  } else {
    // paintbrush
    const handle = mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.18, 8), mat("#caa45d"));
    const tip = mesh(new THREE.ConeGeometry(0.018, 0.05, 10), mat(color));
    tip.position.y = 0.11;
    g.add(handle, tip);
  }
  return g;
}

function buildPet(value: string, color: string): THREE.Group {
  const g = new THREE.Group();
  const metallic = value === "robot";
  const body = mesh(new THREE.SphereGeometry(0.11, 20, 18), mat(color, metallic ? { metalness: 0.3, roughness: 0.5 } : {}));
  body.scale.set(1, 0.95, 1.05);
  g.add(body);
  // ears (cones) for kitten/puppy/bunny/dragon
  if (value !== "robot" && value !== "rocketpet") {
    const earH = value === "bunny" ? 0.13 : 0.06;
    for (const x of [-0.05, 0.05]) {
      const ear = mesh(new THREE.ConeGeometry(0.03, earH, 10), mat(color));
      ear.position.set(x, 0.1, 0);
      g.add(ear);
    }
  }
  if (value === "robot") {
    const antenna = mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.05, 6), mat("#9aa7b5", { metalness: 0.6 }));
    antenna.position.y = 0.12;
    const bulb = mesh(new THREE.SphereGeometry(0.015, 8, 8), mat("#ff5a5a", { emissive: "#ff5a5a", emissiveIntensity: 0.6 }));
    bulb.position.y = 0.15;
    g.add(antenna, bulb);
  }
  if (value === "rocketpet") {
    const fin = mesh(new THREE.ConeGeometry(0.04, 0.08, 4), mat("#ffffff"));
    fin.position.y = -0.1;
    g.add(fin);
  }
  // eyes
  for (const x of [-0.035, 0.035]) {
    const eye = mesh(new THREE.SphereGeometry(0.016, 10, 10), mat("#241a2b"));
    eye.position.set(x, 0.02, 0.092);
    g.add(eye);
  }
  return g;
}

function buildAura(value: string, color: string): THREE.Group {
  const g = new THREE.Group();
  const glow = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 });
  // a halo ring of little orbs
  const count = value === "stars" || value === "sparkle" ? 8 : 10;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const size = value === "fire" ? 0.05 : 0.035;
    const orb = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 8), glow);
    orb.position.set(Math.cos(a) * 0.55, Math.sin(i * 1.7) * 0.45, Math.sin(a) * 0.55);
    g.add(orb);
  }
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.012, 8, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.5;
  g.add(ring);
  return g;
}

/** Build a procedural prop for an equipped accessory, or null if unsupported. */
export function buildAccessory(
  slot: string,
  value: string,
  color: string,
): THREE.Group | null {
  switch (slot) {
    case "hat":
      return buildHat(value, color);
    case "glasses":
      return buildGlasses(value, color);
    case "backpack":
      return buildBackpack(color);
    case "handheld":
      return buildHandheld(value, color);
    case "pet":
      return buildPet(value, color);
    case "aura":
      return buildAura(value, color);
    default:
      return null;
  }
}

/** Real .glb accessories come in arbitrary sizes/origins. Normalize one to a
 * sensible world size for its slot and anchor it (hats/pets sit on their base,
 * others centered) so the same per-slot placement offsets work as for the
 * built-in props. Returns a wrapper group ready to attach. */
export function normalizeGlb(scene: THREE.Object3D, slot: string): THREE.Group {
  const target: Record<string, number> = {
    hat: 0.2, // hats are sized by WIDTH (head circumference), not max dim
    glasses: 0.14,
    backpack: 0.3,
    handheld: 0.22,
    pet: 0.24,
  };
  const t = target[slot] ?? 0.22;
  scene.position.set(0, 0, 0);
  scene.scale.setScalar(1);
  scene.updateWorldMatrix(true, true);
  let box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  // Hats fit the head by their horizontal footprint so a tall hat (wizard/party
  // cone) keeps its height instead of being shrunk to a dot by max-dim scaling.
  const denom =
    slot === "hat"
      ? Math.max(size.x, size.z) || 1
      : Math.max(size.x, size.y, size.z) || 1;
  scene.scale.setScalar(t / denom);
  scene.updateWorldMatrix(true, true);
  box = new THREE.Box3().setFromObject(scene);
  const c = box.getCenter(new THREE.Vector3());
  if (slot === "hat" || slot === "pet") {
    scene.position.set(-c.x, -box.min.y, -c.z); // base at origin
  } else {
    scene.position.set(-c.x, -c.y, -c.z); // centered
  }
  scene.traverse((o) => (o.frustumCulled = false));
  const wrap = new THREE.Group();
  wrap.add(scene);
  return wrap;
}

/** Dispose a built accessory's geometry + materials. */
export function disposeAccessory(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mtl = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mtl)) mtl.forEach((x) => x.dispose());
    else mtl?.dispose();
  });
}
