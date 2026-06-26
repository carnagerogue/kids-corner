// ---------------------------------------------------------------------------
// MysteryBox — one free surprise box per day (coins, an item, or an XP boost).
// Reuses the synced daily-spin guard (canSpinFree / APPLY_SPIN) so it can't be
// reopened the same day, even across devices.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { createPortal } from "react-dom";
import type { KidId } from "../../types";
import { playFanfare } from "../../chime";
import { useAvatarEconomy } from "./AvatarEconomy";
import { itemById } from "./AvatarManifest";
import type { BoxReward } from "./AvatarRewardEngine";

export function MysteryBox({
  kidId,
  onCelebrate,
}: {
  kidId: KidId;
  onCelebrate?: () => void;
}) {
  const econ = useAvatarEconomy(kidId);
  const [phase, setPhase] = useState<"idle" | "opening" | "reveal">("idle");
  const [reward, setReward] = useState<BoxReward | null>(null);

  const canOpen = econ.canOpenDailyBox;

  const open = () => {
    if (!canOpen || phase !== "idle") return;
    setPhase("opening");
    const r = econ.openDailyBox();
    window.setTimeout(() => {
      setReward(r);
      setPhase("reveal");
      playFanfare();
      onCelebrate?.();
    }, 900);
  };

  const close = () => {
    setPhase("idle");
    setReward(null);
  };

  const rewardItem = reward?.itemId ? itemById(reward.itemId) : undefined;

  return (
    <div className="mbox3d">
      <div className="mbox3d__card">
        <div className={`mbox3d__gift ${phase === "opening" ? "is-shaking" : ""}`}>
          🎁
        </div>
        <h3>Daily Mystery Box</h3>
        {canOpen ? (
          <>
            <p className="mbox3d__sub">A free surprise is waiting for you!</p>
            <button
              className="bigbtn"
              onClick={open}
              disabled={phase !== "idle"}
            >
              {phase === "opening" ? "Opening…" : "✨ Open Box"}
            </button>
            <p className="mbox3d__teaser">
              Could be coins 🪙, a surprise item 🎁, or an XP boost ⚡
            </p>
          </>
        ) : (
          <>
            <p className="mbox3d__sub">You opened today's box! 🎉</p>
            <button className="bigbtn is-done" disabled>
              Come back tomorrow
            </button>
          </>
        )}
      </div>

      {phase === "reveal" &&
        reward &&
        createPortal(
          <div className="boxreveal" role="alertdialog" onClick={close}>
            <div className="boxreveal__card" onClick={(e) => e.stopPropagation()}>
              <div className="boxreveal__confetti" aria-hidden>
                {Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      left: `${(i * 37) % 100}%`,
                      animationDelay: `${(i % 6) * 0.1}s`,
                      background: ["#ff5a8a", "#ffd23f", "#4ade80", "#38bdf8", "#a855f7"][i % 5],
                    }}
                  />
                ))}
              </div>
              <div className="boxreveal__emoji">{rewardItem?.emoji ?? reward.emoji}</div>
              <h2 className="boxreveal__title">You got…</h2>
              <p className="boxreveal__reward">
                {rewardItem ? rewardItem.name : reward.label}
              </p>
              {reward.coins > 0 && (
                <p className="boxreveal__coins">+{reward.coins} 🪙</p>
              )}
              <button className="bigbtn" onClick={close}>
                🎉 Awesome!
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
