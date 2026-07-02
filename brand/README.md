# Luminara brand assets

Master logo source files (not served by the app — kept here for reference and
re-export).

- **`luminara-logo-transparent.svg`** — the full lockup (illustration + LUMINARA
  wordmark + tagline) on a transparent background. The master.
- **`luminara-logo-solid.svg`** — same lockup on a solid background (use where
  transparency isn't wanted, e.g. some social / store contexts).

Each SVG wraps a high-res PNG (~1.3 MB), so they're the originals, not tiny
vectors.

## Rendered assets the app actually uses (in `public/`)

- **`public/luminara-logo.png`** — 720px transparent PNG of the full lockup;
  shown on the entry / kid-login / connect screens.
- **`public/luminara-icon.png`** — the illustration circle only, cropped from
  the logo; used as the top-left mark in the logged-in header. (The `<link
  rel="icon">` favicon in `index.html` is a small inline SVG spark, since the
  detailed illustration is illegible at 16px.)

To regenerate the web PNGs after editing the logo: render
`luminara-logo-transparent.svg` to a ~720px transparent PNG (e.g. headless
Chrome), and crop the illustration circle for the icon.
