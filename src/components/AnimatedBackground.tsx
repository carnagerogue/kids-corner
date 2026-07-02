import { useApp } from "../store/AppContext";
import { resolveTheme } from "../data/themes";

/**
 * A fixed, full-screen, non-interactive layer of softly drifting color fields,
 * themed to the active kid's chosen look. Sits behind all app content.
 */
export function AnimatedBackground() {
  const { state } = useApp();
  const theme = resolveTheme(state.themes[state.activeKid]);

  const [b1, b2, b3] = theme.background.blobs;
  const blob = (c: string) => `radial-gradient(circle, ${c} 0%, transparent 70%)`;

  return (
    <div className="funbg" aria-hidden="true">
      <div className="funbg__blob funbg__blob--1" style={{ background: blob(b1) }} />
      <div className="funbg__blob funbg__blob--2" style={{ background: blob(b2) }} />
      <div className="funbg__blob funbg__blob--3" style={{ background: blob(b3) }} />
    </div>
  );
}
