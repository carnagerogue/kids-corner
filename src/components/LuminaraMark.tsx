/**
 * The Luminara brand mark — a four-point sparkle in the teal→violet→amber
 * gradient, with a small guiding star. Scalable; pass `size` (px) and an
 * optional className (e.g. the existing `login__logo` / `topbar__logo` so it
 * keeps its glow + spacing). Replaces the old ☀️ emoji lockup.
 */
export function LuminaraMark({
  size = 44,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Luminara"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="luminara-mark"
          x1="6"
          y1="4"
          x2="40"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#12b5a5" />
          <stop offset="0.52" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#fb8a3c" />
        </linearGradient>
      </defs>
      <path
        d="M24 3 C25.2 17 31 22.8 45 24 C31 25.2 25.2 31 24 45 C22.8 31 17 25.2 3 24 C17 22.8 22.8 17 24 3 Z"
        fill="url(#luminara-mark)"
      />
      <circle cx="38.5" cy="9.5" r="2.4" fill="#fbbf24" />
    </svg>
  );
}
