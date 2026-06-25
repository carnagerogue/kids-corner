import { useMemo } from "react";

/** Cheerful things that drift up the screen behind the app. */
const SHAPES = [
  "⭐", "✨", "☁️", "🎈", "🌈", "☀️",
  "🪐", "🌙", "🚀", "💫", "🦋", "🌻",
];

type Float = {
  emoji: string;
  left: number; // vw
  size: number; // rem
  duration: number; // s
  delay: number; // s (negative = already in flight)
  drift: number; // px horizontal sway
};

/**
 * A fixed, full-screen, non-interactive layer of slowly drifting color blobs
 * and floating emoji. Sits behind all app content (z-index: -1). Generated once
 * so the scene stays stable across re-renders.
 */
export function AnimatedBackground() {
  const floats = useMemo<Float[]>(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      emoji: SHAPES[i % SHAPES.length],
      left: Math.round(Math.random() * 100),
      size: 1.3 + Math.random() * 2.6,
      duration: 16 + Math.random() * 22,
      delay: -Math.random() * 32,
      drift: Math.round((Math.random() * 2 - 1) * 70),
    }));
  }, []);

  return (
    <div className="funbg" aria-hidden="true">
      <div className="funbg__blob funbg__blob--1" />
      <div className="funbg__blob funbg__blob--2" />
      <div className="funbg__blob funbg__blob--3" />
      <div className="funbg__floats">
        {floats.map((f, i) => (
          <span
            key={i}
            className="funbg__float"
            style={{
              left: `${f.left}vw`,
              fontSize: `${f.size}rem`,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              ["--drift" as string]: `${f.drift}px`,
            }}
          >
            {f.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}
