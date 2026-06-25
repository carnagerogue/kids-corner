// A tiny Web Audio chime for "it's time for the next thing on the schedule".
// Browsers block audio until the user interacts, so we lazily create the
// AudioContext and unlock it on the first pointer/key event.

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function unlock() {
  ensureCtx();
  window.removeEventListener("pointerdown", unlock);
  window.removeEventListener("keydown", unlock);
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

/** A gentle two-note rising chime. No-op if audio is unavailable/blocked. */
export function playChime() {
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const notes = [880, 1174.66]; // A5 -> D6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = t0 + i * 0.16;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.6);
  });
}
