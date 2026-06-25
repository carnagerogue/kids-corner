import { useMemo } from "react";
import { useApp } from "../store/AppContext";
import { resolveTheme } from "../data/themes";

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
 * and floating emoji, themed to the active kid's chosen look. Sits behind all
 * app content (z-index: -1).
 */
export function AnimatedBackground() {
  const { state } = useApp();
  const theme = resolveTheme(state.themes[state.activeKid]);

  // Regenerate the scene when the theme changes; stable otherwise.
  const floats = useMemo<Float[]>(() => {
    const shapes = theme.background.floats;
    return Array.from({ length: 18 }, (_, i) => ({
      emoji: shapes[i % shapes.length],
      left: Math.round(Math.random() * 100),
      size: 1.3 + Math.random() * 2.6,
      duration: 16 + Math.random() * 22,
      delay: -Math.random() * 32,
      drift: Math.round((Math.random() * 2 - 1) * 70),
    }));
  }, [theme.id]);

  const [b1, b2, b3] = theme.background.blobs;
  const blob = (c: string) => `radial-gradient(circle, ${c} 0%, transparent 70%)`;

  return (
    <div className="funbg" aria-hidden="true">
      <div className="funbg__blob funbg__blob--1" style={{ background: blob(b1) }} />
      <div className="funbg__blob funbg__blob--2" style={{ background: blob(b2) }} />
      <div className="funbg__blob funbg__blob--3" style={{ background: blob(b3) }} />
      <div className="funbg__floats">
        {floats.map((f, i) => (
          <span
            key={`${theme.id}-${i}`}
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
