// ---------------------------------------------------------------------------
// AvatarStage — the polished character panel.
//
// Progressive enhancement:
//   • WebGL available  → lazy-load the 3D viewer (procedural chibi now, real VRM
//     when an asset is added). Heavy 3D libs load only here, on demand.
//   • No WebGL / load error → gracefully fall back to the proven 2D avatar.
// Learners can also toggle "Classic 2D" anytime (remembered per device).
// ---------------------------------------------------------------------------
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "../../store/AppContext";
import { equippedAvatar } from "../../store/selectors";
import { Avatar } from "../../data/avatar";
import type { KidId } from "../../types";
import { currentLoadout } from "./AvatarEconomy";
import { webglAvailable, type EmoteName } from "./webgl";

const AvatarViewer = lazy(() => import("./AvatarViewer"));

const MODE_KEY = "kids-corner:avatar:stageMode";

/** Catches any 3D render/runtime error and shows the 2D fallback instead. */
class StageErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const EMOTES: { name: EmoteName; label: string; emoji: string }[] = [
  { name: "wave", label: "Wave", emoji: "👋" },
  { name: "jump", label: "Jump", emoji: "⬆️" },
  { name: "victory", label: "Victory", emoji: "🎉" },
  { name: "think", label: "Think", emoji: "🤔" },
];

export function AvatarStage({
  kidId,
  celebrate = 0,
  showControls = true,
}: {
  kidId: KidId;
  /** Bump this number to make the avatar play a victory emote (e.g. on buy). */
  celebrate?: number;
  showControls?: boolean;
}) {
  const { state } = useApp();
  const loadout = currentLoadout(state, kidId);
  const config2d = equippedAvatar(state, kidId);

  const canWebgl = useMemo(() => webglAvailable(), []);
  const [mode, setMode] = useState<"3d" | "2d">(() => {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === "2d" || saved === "3d") return canWebgl ? saved : "2d";
    return canWebgl ? "3d" : "2d";
  });
  const [emote, setEmote] = useState<{ name: EmoteName; key: number }>({
    name: "idle",
    key: 0,
  });

  // External celebrate trigger (e.g. after a purchase) → victory emote.
  const lastCelebrate = useRef(celebrate);
  useEffect(() => {
    if (celebrate !== lastCelebrate.current) {
      lastCelebrate.current = celebrate;
      setEmote((e) => ({ name: "victory", key: e.key + 1 }));
    }
  }, [celebrate]);

  const setStageMode = (m: "3d" | "2d") => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* ignore */
    }
  };

  const fallback2d = (
    <div className="stage__twod">
      <Avatar config={config2d} size={240} animated showScene />
    </div>
  );

  return (
    <div className="avstage">
      <div className="avstage__canvas">
        {mode === "3d" && canWebgl ? (
          <StageErrorBoundary fallback={fallback2d}>
            <Suspense fallback={<StageSkeleton />}>
              <AvatarViewer loadout={loadout} emote={emote} />
            </Suspense>
          </StageErrorBoundary>
        ) : (
          fallback2d
        )}
      </div>

      {showControls && (
        <div className="avstage__controls">
          {mode === "3d" && canWebgl && (
            <div className="avstage__emotes">
              {EMOTES.map((e) => (
                <button
                  key={e.name}
                  className="emotebtn"
                  title={e.label}
                  onClick={() => setEmote((p) => ({ name: e.name, key: p.key + 1 }))}
                >
                  <span aria-hidden>{e.emoji}</span>
                </button>
              ))}
            </div>
          )}
          {canWebgl && (
            <div className="avstage__toggle" role="tablist" aria-label="Avatar view">
              <button
                className={`segbtn ${mode === "3d" ? "is-active" : ""}`}
                onClick={() => setStageMode("3d")}
              >
                ✨ 3D
              </button>
              <button
                className={`segbtn ${mode === "2d" ? "is-active" : ""}`}
                onClick={() => setStageMode("2d")}
              >
                🖼️ Classic
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StageSkeleton() {
  return (
    <div className="stage__skeleton">
      <div className="stage__skeleton-orb" />
      <p>Loading your character…</p>
    </div>
  );
}
