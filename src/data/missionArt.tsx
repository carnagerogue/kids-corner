import type { ReactElement } from "react";

/**
 * Simple, friendly built-in illustrations that hint at the finished result of a
 * mission. Shown when a grown-up hasn't attached a real example photo. Each is a
 * flat SVG on a soft rounded card (viewBox 0 0 160 100).
 */

const frame = (bg: string, kids: ReactElement) => (
  <svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" role="img">
    <rect x="0" y="0" width="160" height="100" rx="14" fill={bg} />
    {kids}
  </svg>
);

const ART: Record<string, ReactElement> = {
  "craft-cardboard-city": frame(
    "#fff1e6",
    <g>
      <rect x="22" y="42" width="30" height="44" rx="3" fill="#c98a4b" />
      <rect x="60" y="26" width="34" height="60" rx="3" fill="#b5703a" />
      <rect x="102" y="50" width="30" height="36" rx="3" fill="#d99a5c" />
      <g fill="#fff6ea">
        <rect x="28" y="50" width="7" height="7" rx="1" />
        <rect x="39" y="50" width="7" height="7" rx="1" />
        <rect x="66" y="34" width="8" height="8" rx="1" />
        <rect x="80" y="34" width="8" height="8" rx="1" />
        <rect x="66" y="50" width="8" height="8" rx="1" />
        <rect x="80" y="50" width="8" height="8" rx="1" />
        <rect x="108" y="58" width="7" height="7" rx="1" />
        <rect x="119" y="58" width="7" height="7" rx="1" />
      </g>
      <rect x="33" y="70" width="9" height="16" rx="1" fill="#7c4a23" />
      <rect x="72" y="70" width="10" height="16" rx="1" fill="#7c4a23" />
    </g>,
  ),
  "build-marble-run": frame(
    "#eef4ff",
    <g>
      <rect x="20" y="22" width="64" height="9" rx="4" fill="#7aa7ff" transform="rotate(8 52 26)" />
      <rect x="74" y="42" width="64" height="9" rx="4" fill="#5b8cf0" transform="rotate(-12 106 46)" />
      <rect x="26" y="60" width="64" height="9" rx="4" fill="#7aa7ff" transform="rotate(10 58 64)" />
      <path d="M104 76 h22 v10 a6 6 0 0 1-6 6 h-10 a6 6 0 0 1-6-6 z" fill="#cfe0ff" />
      <circle cx="40" cy="20" r="7" fill="#ff5a6e" />
      <circle cx="38" cy="18" r="2" fill="#fff" opacity="0.7" />
    </g>,
  ),
  "build-blanket-fort": frame(
    "#f3eaff",
    <g>
      <rect x="26" y="40" width="10" height="46" rx="2" fill="#9a6cd6" />
      <rect x="124" y="40" width="10" height="46" rx="2" fill="#9a6cd6" />
      <path d="M26 44 Q80 14 134 44 L134 52 Q80 30 26 52 Z" fill="#c9a6f2" />
      <path d="M30 50 Q80 30 130 50 L130 86 L30 86 Z" fill="#e7d6fb" />
      <path d="M70 86 V58 q10 -8 20 0 V86 Z" fill="#b487ea" />
      <rect x="118" y="26" width="2" height="18" fill="#7c4a23" />
      <path d="M120 26 l12 5 l-12 5 z" fill="#ffb627" />
    </g>,
  ),
  "build-tallest-tower": frame(
    "#fff7e6",
    <g>
      <rect x="58" y="64" width="44" height="20" rx="3" fill="#ff7a59" />
      <rect x="63" y="46" width="34" height="18" rx="3" fill="#ffc145" />
      <rect x="68" y="30" width="24" height="16" rx="3" fill="#4ec0a0" />
      <rect x="72" y="16" width="16" height="14" rx="3" fill="#6aa6ff" />
      <circle cx="80" cy="11" r="4" fill="#ff5a6e" />
    </g>,
  ),
  "craft-friendship-bracelets": frame(
    "#ffeef5",
    <g>
      <ellipse cx="80" cy="52" rx="42" ry="30" fill="none" stroke="#ff8fb3" strokeWidth="6" strokeDasharray="2 9" strokeLinecap="round" />
      <circle cx="80" cy="22" r="8" fill="#ffd23f" />
      <circle cx="116" cy="44" r="7" fill="#6aa6ff" />
      <circle cx="108" cy="76" r="7" fill="#4ec0a0" />
      <circle cx="52" cy="76" r="7" fill="#ff7a59" />
      <circle cx="44" cy="44" r="7" fill="#b487ea" />
    </g>,
  ),
  "craft-paper-plate-animals": frame(
    "#eafaf0",
    <g>
      <circle cx="80" cy="54" r="34" fill="#fff" stroke="#cdeeda" strokeWidth="3" />
      <circle cx="54" cy="30" r="11" fill="#f6b27a" />
      <circle cx="106" cy="30" r="11" fill="#f6b27a" />
      <circle cx="69" cy="50" r="5" fill="#33304a" />
      <circle cx="91" cy="50" r="5" fill="#33304a" />
      <circle cx="80" cy="62" r="5" fill="#ff7a59" />
      <path d="M70 72 q10 8 20 0" fill="none" stroke="#33304a" strokeWidth="3" strokeLinecap="round" />
    </g>,
  ),
  "outdoor-obstacle-course": frame(
    "#eafaf0",
    <g>
      <path d="M16 80 Q50 40 84 70 T140 40" fill="none" stroke="#9bd5ad" strokeWidth="5" strokeDasharray="6 7" strokeLinecap="round" />
      <path d="M28 82 l9 -22 l9 22 z" fill="#ff7a59" />
      <path d="M70 82 l9 -22 l9 22 z" fill="#ffb627" />
      <rect x="126" y="30" width="2" height="22" fill="#7c4a23" />
      <path d="M128 30 l12 5 l-12 5 z" fill="#4ec0a0" />
    </g>,
  ),
  "science-volcano": frame(
    "#fff0ec",
    <g>
      <path d="M40 86 L66 40 h28 l26 46 z" fill="#8a5a3c" />
      <path d="M66 40 h28 l-6 12 h-16 z" fill="#5e3b25" />
      <path d="M72 44 q8 -26 16 0 q-2 14 -8 14 q-6 0 -8 -14z" fill="#ff5a3c" />
      <circle cx="80" cy="26" r="4" fill="#ff8a3d" />
      <circle cx="94" cy="34" r="3" fill="#ffb627" />
      <circle cx="68" cy="34" r="3" fill="#ffb627" />
    </g>,
  ),
  "draw-comic-strip": frame(
    "#eef4ff",
    <g fill="none" stroke="#5b8cf0" strokeWidth="3">
      <rect x="22" y="22" width="52" height="26" rx="3" fill="#fff" />
      <rect x="86" y="22" width="52" height="26" rx="3" fill="#fff" />
      <rect x="22" y="54" width="52" height="26" rx="3" fill="#fff" />
      <rect x="86" y="54" width="52" height="26" rx="3" fill="#fff" />
      <path d="M30 38 q8 -10 16 0" strokeWidth="2.5" />
      <circle cx="106" cy="33" r="5" strokeWidth="2.5" />
      <path d="M34 68 h28" strokeWidth="2.5" strokeLinecap="round" />
    </g>,
  ),
  "music-kitchen-band": frame(
    "#fff7e6",
    <g>
      <path d="M48 50 h44 l-5 34 a6 6 0 0 1-6 5 H59 a6 6 0 0 1-6-5 z" fill="#b6bcc6" />
      <rect x="44" y="44" width="52" height="9" rx="4" fill="#8b929e" />
      <rect x="98" y="34" width="6" height="30" rx="3" fill="#c98a4b" transform="rotate(28 101 49)" />
      <g fill="#ff7a59">
        <circle cx="118" cy="30" r="4" />
        <rect x="121" y="16" width="3" height="16" />
      </g>
      <g fill="#6aa6ff">
        <circle cx="36" cy="26" r="4" />
        <rect x="39" y="14" width="3" height="14" />
      </g>
    </g>,
  ),
};

export function hasMissionArt(id: string): boolean {
  return id in ART;
}

/** Inline illustration for a mission, or null when none exists. */
export function MissionArt({
  id,
  className,
}: {
  id: string;
  className?: string;
}): ReactElement | null {
  const art = ART[id];
  if (!art) return null;
  return <span className={className}>{art}</span>;
}
