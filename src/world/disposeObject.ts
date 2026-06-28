import * as THREE from "three";

/**
 * Recursively dispose geometries, materials, and their textures under an object.
 * R3F does NOT dispose objects handed to it via <primitive> (it only disposes
 * what it builds declaratively), and cloned GLTF scenes share their geometry /
 * materials / textures with the source — so loaders that mount via <primitive>
 * must dispose on unmount or they leak GPU memory on every Canvas remount.
 */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (material) {
      const list = Array.isArray(material) ? material : [material];
      for (const m of list) disposeMaterial(m);
    }
  });
}

function disposeMaterial(material: THREE.Material): void {
  for (const key of Object.keys(material)) {
    const value = (material as unknown as Record<string, unknown>)[key];
    if (value && (value as THREE.Texture).isTexture) {
      (value as THREE.Texture).dispose();
    }
  }
  material.dispose();
}
