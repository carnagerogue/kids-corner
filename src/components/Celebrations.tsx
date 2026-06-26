import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppContext";
import { getKidXp } from "../store/selectors";
import { getLevelInfo } from "../data/levels";
import { BADGE_BY_ID } from "../data/badges";
import { playFanfare } from "../chime";
import type { KidId } from "../types";

type Party = {
  kind: "level" | "badge" | "goal";
  emoji: string;
  title: string;
  subtitle: string;
};

const CONFETTI_COLORS = [
  "#ff5a8a",
  "#ffd23f",
  "#4ade80",
  "#38bdf8",
  "#a855f7",
  "#fb923c",
];

function Confetti() {
  // Stable-per-mount scatter; app code may use Math.random freely.
  const pieces = Array.from({ length: 42 }, (_, i) => ({
    left: Math.random() * 100,
    bg: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.6,
    duration: 1.8 + Math.random() * 1.4,
    size: 7 + Math.random() * 7,
    rot: Math.random() * 360,
    round: i % 3 === 0,
  }));
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti__bit"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.bg,
            borderRadius: p.round ? "50%" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Watches the logged-in kid's level and badges and throws a full-screen party
 * (confetti + fanfare) the moment one goes up — including when a grown-up's
 * approval syncs in from another device. Only fires on live transitions, never
 * for milestones already reached at load (mirrors ScheduleNotifier).
 */
export function Celebrations({ user }: { user: KidId }) {
  const { state } = useApp();
  const levelNum = getLevelInfo(getKidXp(state, user)).rank.level;
  const badges = state.kids[user]?.badges ?? [];
  const badgeKey = badges.join(",");

  const seenLevel = useRef(levelNum);
  const seenBadges = useRef(new Set(badges));
  const [queue, setQueue] = useState<Party[]>([]);

  // Reset the watermarks when switching kids so we don't party for the new
  // kid's already-earned milestones.
  useEffect(() => {
    seenLevel.current = getLevelInfo(getKidXp(state, user)).rank.level;
    seenBadges.current = new Set(state.kids[user]?.badges ?? []);
    setQueue([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const events: Party[] = [];
    if (levelNum > seenLevel.current) {
      const rank = getLevelInfo(getKidXp(state, user)).rank;
      events.push({
        kind: "level",
        emoji: rank.emoji,
        title: `Level ${rank.level}!`,
        subtitle: `You're a ${rank.title} now`,
      });
    }
    for (const id of badges) {
      if (!seenBadges.current.has(id)) {
        const badge = BADGE_BY_ID[id];
        if (badge) {
          events.push({
            kind: "badge",
            emoji: badge.emoji,
            title: "New badge!",
            subtitle: badge.title,
          });
        }
      }
    }
    if (events.length) {
      seenLevel.current = levelNum;
      seenBadges.current = new Set(badges);
      setQueue((q) => [...q, ...events]);
      playFanfare();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelNum, badgeKey]);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => setQueue((q) => q.slice(1)), 6500);
    return () => window.clearTimeout(t);
  }, [current]);

  if (!current) return null;

  return createPortal(
    <div
      className="party"
      role="alertdialog"
      aria-label={`${current.title} ${current.subtitle}`}
      onClick={() => setQueue((q) => q.slice(1))}
    >
      <Confetti />
      <div className={`party__card party__card--${current.kind}`}>
        <span className="party__emoji">{current.emoji}</span>
        <strong className="party__title">{current.title}</strong>
        <span className="party__sub">{current.subtitle}</span>
        <button className="btn btn--primary btn--big party__btn">🎉 Yay!</button>
      </div>
    </div>,
    document.body,
  );
}
