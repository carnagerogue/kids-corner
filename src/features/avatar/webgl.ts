// ---------------------------------------------------------------------------
// Lightweight helpers shared by AvatarStage (eager) and AvatarViewer (lazy).
// Kept free of any three.js import so AvatarStage can use them WITHOUT pulling
// the heavy 3D bundle into the main chunk — that only loads via the lazy
// import("./AvatarViewer").
// ---------------------------------------------------------------------------

export type EmoteName = "wave" | "jump" | "victory" | "think" | "idle";

/** Is WebGL usable on this device? (school devices sometimes disable it). */
export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
