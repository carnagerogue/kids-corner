// ---------------------------------------------------------------------------
// AwardsPanel — a two-tab panel: Badges (achievement milestones) and Ranks
// (the family leaderboard). Pure presentation; WorldView supplies the earned
// set and the leaderboard rows.
// ---------------------------------------------------------------------------
import { useState } from "react";
import { ACHIEVEMENTS } from "./achievements";
import { levelTitle } from "./academyQuests";
import type { PlayerStats } from "./worldSync";

type Props = {
  earned: string[];
  rows: PlayerStats[];
  selfKidId: string;
  syncReady: boolean;
  onClose: () => void;
};

export function AwardsPanel({ earned, rows, selfKidId, syncReady, onClose }: Props) {
  const [tab, setTab] = useState<"badges" | "ranks">("badges");
  const earnedSet = new Set(earned);
  const ranked = [...rows].sort((a, b) => b.xp - a.xp);

  return (
    <div className="academy awards" role="dialog" aria-modal="true" aria-labelledby="awards-title">
      <div className="academy__card">
        <button className="academy__close" onClick={onClose} aria-label="Close awards">
          ×
        </button>
        <div className="academy__head">
          <h3 id="awards-title">🏅 Awards</h3>
          <span className="academy__lv">
            {earnedSet.size}/{ACHIEVEMENTS.length} badges
          </span>
        </div>

        <div className="awards__tabs" role="tablist" aria-label="Awards sections">
          <button
            role="tab"
            aria-selected={tab === "badges"}
            className={`awards__tab${tab === "badges" ? " is-on" : ""}`}
            onClick={() => setTab("badges")}
          >
            🎖️ Badges
          </button>
          <button
            role="tab"
            aria-selected={tab === "ranks"}
            className={`awards__tab${tab === "ranks" ? " is-on" : ""}`}
            onClick={() => setTab("ranks")}
          >
            🏆 Ranks
          </button>
        </div>

        {tab === "badges" ? (
          <div className="awards__badges">
            {ACHIEVEMENTS.map((a) => {
              const got = earnedSet.has(a.id);
              return (
                <div key={a.id} className={`awards__badge${got ? " is-earned" : ""}`}>
                  <span className="awards__badgeicon">{got ? a.emoji : "🔒"}</span>
                  <strong>{a.name}</strong>
                  <small>{a.description}</small>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <ol className="awards__ranks">
              {ranked.map((row, i) => (
                <li
                  key={row.kidId}
                  className={`awards__rank${row.kidId === selfKidId ? " is-self" : ""}`}
                >
                  <span className="awards__place">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <span className="awards__who" style={{ borderColor: row.color }}>
                    <strong>{row.name}</strong>
                    <small>
                      Lv {row.level} · {levelTitle(row.level)}
                    </small>
                  </span>
                  <span className="awards__stat">
                    {row.xp} XP
                    {row.streak > 0 && <em> · 🔥{row.streak}</em>}
                    {row.badges > 0 && <em> · 🎖️{row.badges}</em>}
                  </span>
                </li>
              ))}
            </ol>
            {!syncReady && (
              <p className="awards__hint">
                Add a private Family Sync code in Grown-Ups to climb the
                leaderboard together with siblings!
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
