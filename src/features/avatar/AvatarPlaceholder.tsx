// ---------------------------------------------------------------------------
// AvatarPlaceholder — the premium "no model yet" empty state for the 3D stage.
//
// Shown when no .vrm exists for the learner's base model. It is deliberately
// NOT a fake 3D character and NOT a sad empty box: a cozy, Nintendo-style
// "your character will appear here" hero card built from inline SVG + CSS only
// (no external images), with a soft purple/pink/blue gradient, a glowing anime
// silhouette, a friendly headline, a 3-step mini-guide and a guide button.
//
// The shop, coins, XP and customization all keep working below this card — the
// copy reassures the learner of that so the empty state feels intentional.
// ---------------------------------------------------------------------------
import { useId } from "react";

export interface AvatarPlaceholderProps {
  kidId: string;
  firstName?: string;
  /** Wire this to open VROID_ASSET_IMPORT_GUIDE.md (or a hosted link). */
  onGuide?: () => void;
}

export function AvatarPlaceholder({
  kidId,
  firstName,
  onGuide,
}: AvatarPlaceholderProps) {
  // Unique gradient/filter ids so multiple placeholders never collide.
  const uid = useId().replace(/[:]/g, "");
  const gBody = `avph-body-${uid}`;
  const gHair = `avph-hair-${uid}`;
  const gGlow = `avph-glow-${uid}`;
  const gRing = `avph-ring-${uid}`;
  const blur = `avph-blur-${uid}`;

  const who = firstName?.trim() ? firstName.trim() : "Your";
  const possessive = firstName?.trim() ? `${who}'s` : "Your";

  return (
    <div className="avph" data-kid={kidId} role="group" aria-label="Character coming soon">
      {/* Soft drifting sparkle field behind the hero */}
      <div className="avph__sky" aria-hidden="true">
        <i style={{ "--x": "12%", "--y": "22%", "--d": "0s" } as React.CSSProperties} />
        <i style={{ "--x": "82%", "--y": "30%", "--d": "1.1s" } as React.CSSProperties} />
        <i style={{ "--x": "68%", "--y": "70%", "--d": "2.3s" } as React.CSSProperties} />
        <i style={{ "--x": "24%", "--y": "78%", "--d": "0.6s" } as React.CSSProperties} />
        <i style={{ "--x": "48%", "--y": "12%", "--d": "1.7s" } as React.CSSProperties} />
      </div>

      <div className="avph__hero">
        {/* Glowing pedestal the silhouette stands on */}
        <div className="avph__pedestal" aria-hidden="true" />

        <svg
          className="avph__figure"
          viewBox="0 0 220 300"
          role="img"
          aria-label="Illustration of a character about to appear"
        >
          <defs>
            <linearGradient id={gBody} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9b8ff" />
              <stop offset="48%" stopColor="#a98cff" />
              <stop offset="100%" stopColor="#7c5cff" />
            </linearGradient>
            <linearGradient id={gHair} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffd1ec" />
              <stop offset="55%" stopColor="#ff9bd0" />
              <stop offset="100%" stopColor="#b070ff" />
            </linearGradient>
            <radialGradient id={gGlow} cx="50%" cy="42%" r="60%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#d8c8ff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={gRing} cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#39b7ff" stopOpacity="0" />
              <stop offset="86%" stopColor="#39b7ff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#39b7ff" stopOpacity="0" />
            </radialGradient>
            <filter id={blur} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
          </defs>

          {/* Halo glow behind the character */}
          <ellipse cx="110" cy="128" rx="96" ry="104" fill={`url(#${gGlow})`} />

          {/* The friendly anime silhouette — one smooth, rounded hero pose.
              Big chibi head, soft shoulders, gentle hands-clasped stance. */}
          <g className="avph__char">
            {/* soft contact shadow */}
            <ellipse cx="110" cy="266" rx="58" ry="13" fill="#3a1d6e" opacity="0.35" filter={`url(#${blur})`} />

            {/* body / torso + skirt silhouette, smooth bezier outline */}
            <path
              d="M110 150
                 C 138 150 150 168 150 190
                 C 150 210 158 230 168 252
                 C 172 261 165 268 154 268
                 L 66 268
                 C 55 268 48 261 52 252
                 C 62 230 70 210 70 190
                 C 70 168 82 150 110 150 Z"
              fill={`url(#${gBody})`}
            />

            {/* arms tucked, hands clasped at front — keeps the rounded, cozy read */}
            <path
              d="M86 196 C 92 214 128 214 134 196 C 140 212 128 224 110 224 C 92 224 80 212 86 196 Z"
              fill={`url(#${gBody})`}
              opacity="0.92"
            />

            {/* head — large, soft chibi sphere */}
            <circle cx="110" cy="104" r="50" fill={`url(#${gBody})`} />

            {/* hair — flowing rounded shapes layered over the head */}
            <path
              d="M110 52
                 C 76 52 60 78 60 104
                 C 60 120 64 132 70 140
                 C 64 132 66 112 74 104
                 C 70 122 76 134 84 140
                 C 80 120 86 100 100 92
                 C 120 84 142 92 150 110
                 C 154 96 150 74 138 62
                 C 130 56 121 52 110 52 Z"
              fill={`url(#${gHair})`}
            />
            {/* two soft side locks for an anime feel */}
            <path d="M64 108 C 60 134 64 156 70 168 C 60 150 56 126 60 108 Z" fill={`url(#${gHair})`} opacity="0.85" />
            <path d="M156 108 C 160 134 156 156 150 168 C 160 150 164 126 160 108 Z" fill={`url(#${gHair})`} opacity="0.85" />

            {/* a single subtle highlight to make the silhouette feel lit, not flat */}
            <ellipse cx="94" cy="88" rx="14" ry="20" fill="#ffffff" opacity="0.18" transform="rotate(-18 94 88)" />
          </g>

          {/* orbiting accent ring + sparkles around the hero */}
          <circle cx="110" cy="120" r="92" fill="none" stroke={`url(#${gRing})`} strokeWidth="3" className="avph__orbit" />
          <g className="avph__sparkle avph__sparkle--a">
            <path d="M178 70 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#ffe08a" />
          </g>
          <g className="avph__sparkle avph__sparkle--b">
            <path d="M40 150 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 z" fill="#7ff0ff" />
          </g>
          <g className="avph__sparkle avph__sparkle--c">
            <path d="M150 220 l2.5 6.5 6.5 2.5 -6.5 2.5 -2.5 6.5 -2.5 -6.5 -6.5 -2.5 6.5 -2.5 z" fill="#ff9bd0" />
          </g>
        </svg>
      </div>

      <div className="avph__copy">
        <span className="avph__eyebrow">✨ Coming to life</span>
        <h3 className="avph__title">{possessive} 3D character is almost here!</h3>
        <p className="avph__sub">
          Drop a VRoid <code className="avph__code">.vrm</code> model into the
          project and {who.toLowerCase() === "your" ? "your" : `${who}'s`} hero
          appears right on this stage — fully posable.
        </p>

        <ol className="avph__steps">
          <li className="avph__step">
            <span className="avph__num">1</span>
            <span className="avph__steptext">
              Export a character from <strong>VRoid Studio</strong> as a
              <code className="avph__code">.vrm</code> file.
            </span>
          </li>
          <li className="avph__step">
            <span className="avph__num">2</span>
            <span className="avph__steptext">
              Save it to{" "}
              <code className="avph__code">/public/assets/avatar/models/</code>{" "}
              (e.g. <code className="avph__code">claire-base.vrm</code>).
            </span>
          </li>
          <li className="avph__step">
            <span className="avph__num">3</span>
            <span className="avph__steptext">
              Reopen the studio — the silhouette swaps in for the real model. ✨
            </span>
          </li>
        </ol>

        <div className="avph__actions">
          <button type="button" className="avph__btn" onClick={onGuide}>
            <span className="avph__btnicon" aria-hidden="true">📘</span>
            How to add a model
          </button>
          <span className="avph__pill">
            <span aria-hidden="true">🛍️</span> Shop, coins, XP &amp; customize all
            work below
          </span>
        </div>
      </div>
    </div>
  );
}

export default AvatarPlaceholder;