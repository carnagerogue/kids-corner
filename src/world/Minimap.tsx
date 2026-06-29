// ---------------------------------------------------------------------------
// Minimap — a small north-up radar in the corner so the big neighbourhood is
// easy to navigate. Static points-of-interest (academies, creatures, fountain,
// Champions' Ring, Mayor Nova) plus a live "you" arrow driven by a cheap rAF
// loop that reads the avatar pose ref and moves one DOM node (no React churn).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef } from "react";
import { LANDMARKS } from "./worldGame";
import { CREATURES, CHAMPIONS_RING } from "./worldBattles";
import { FOUNTAIN } from "./WorldContent";

type Pose = { x: number; z: number; heading: number };

const SIZE = 142;
const R = 28; // world half-extent (a touch beyond ROAM = 27)
const PAD = 11;
const toX = (x: number) => PAD + ((x + R) / (2 * R)) * (SIZE - 2 * PAD);
const toY = (z: number) => PAD + ((z + R) / (2 * R)) * (SIZE - 2 * PAD);

export function Minimap({ self }: { self: React.MutableRefObject<Pose> }) {
  const me = useRef<HTMLDivElement>(null);
  const pois = useMemo(() => {
    const list: { x: number; z: number; emoji: string }[] = [];
    for (const l of LANDMARKS) list.push({ x: l.position[0], z: l.position[2], emoji: l.emoji });
    for (const c of CREATURES) {
      if (!c.boss) list.push({ x: c.position[0], z: c.position[2], emoji: c.emoji });
    }
    list.push({ x: 0, z: 2.2, emoji: "⭐" }); // Mayor Nova
    list.push({ x: FOUNTAIN.x, z: FOUNTAIN.z, emoji: "⛲" });
    list.push({ x: CHAMPIONS_RING.x, z: CHAMPIONS_RING.z, emoji: "🏆" });
    return list;
  }, []);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = self.current;
      if (me.current) {
        me.current.style.left = `${toX(s.x)}px`;
        me.current.style.top = `${toY(s.z)}px`;
        // Rotate the up-pointing arrow to the avatar's facing (π - heading).
        me.current.style.transform = `translate(-50%, -50%) rotate(${Math.PI - s.heading}rad)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [self]);

  return (
    <div className="minimap" aria-hidden="true">
      {pois.map((p, i) => (
        <span
          key={i}
          className="minimap__poi"
          style={{ left: `${toX(p.x)}px`, top: `${toY(p.z)}px` }}
        >
          {p.emoji}
        </span>
      ))}
      <div
        ref={me}
        className="minimap__me"
        style={{
          left: `${toX(self.current.x)}px`,
          top: `${toY(self.current.z)}px`,
          transform: `translate(-50%, -50%) rotate(${Math.PI - self.current.heading}rad)`,
        }}
      />
    </div>
  );
}
