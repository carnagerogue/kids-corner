// ---------------------------------------------------------------------------
// AvatarStage — the character panel.
//
// Asset-first: it renders AvatarViewer, which shows a REAL VRoid .vrm if one
// exists for the learner, or a polished "Add VRoid model" placeholder otherwise.
// There is NO procedural/geometry character and no 2D fallback body here.
// Emote buttons appear only when a real 3D model is on stage.
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../store/AppContext";
import { getKid } from "../../store/selectors";
import type { KidId } from "../../types";
import { currentLoadout } from "./AvatarEconomy";
import { AvatarViewer, type StageStatus } from "./AvatarViewer";
import type { EmoteName } from "./webgl";

const GUIDE_URL =
  "https://github.com/carnagerogue/kids-corner/blob/main/VROID_ASSET_IMPORT_GUIDE.md";

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
  const kid = getKid(state, kidId);
  const loadout = currentLoadout(state, kidId);

  const [status, setStatus] = useState<StageStatus>("probing");
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

  return (
    <div className="avstage">
      <div className="avstage__canvas">
        <AvatarViewer
          kidId={kidId}
          firstName={kid.firstName}
          loadout={loadout}
          emote={emote}
          onStatus={setStatus}
          onGuide={() => window.open(GUIDE_URL, "_blank", "noopener")}
        />
      </div>

      {showControls && status === "ready" && (
        <div className="avstage__controls">
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
        </div>
      )}
    </div>
  );
}
