import type * as THREE from "three";

/**
 * Ease an orbit target toward the avatar and translate the camera by exactly
 * the same delta. This preserves the player's orbit angle and zoom distance
 * while making the whole rig follow the character through the world.
 */
export function followOrbitTarget(
  cameraPosition: THREE.Vector3,
  orbitTarget: THREE.Vector3,
  desiredTarget: THREE.Vector3,
  alpha: number,
): void {
  const oldX = orbitTarget.x;
  const oldY = orbitTarget.y;
  const oldZ = orbitTarget.z;
  orbitTarget.lerp(desiredTarget, alpha);
  cameraPosition.x += orbitTarget.x - oldX;
  cameraPosition.y += orbitTarget.y - oldY;
  cameraPosition.z += orbitTarget.z - oldZ;
}
