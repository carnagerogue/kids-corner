# Chrome Web Store — graphic assets

Upload these in the **Store listing** tab, under **Graphic assets**. All sizes
are exact; screenshots/promo tiles are JPEG (no alpha, as the store requires).

| Dashboard slot | Required size | File |
|---|---|---|
| **Store icon** * | 128×128 | `store-icon-128.png` |
| **Screenshot** * (up to 5) | 1280×800 | `screenshot-1-block.jpg` |
| Screenshot | 1280×800 | `screenshot-2-oneclick.jpg` |
| Screenshot | 1280×800 | `screenshot-3-report.jpg` |
| Screenshot | 1280×800 | `screenshot-4-howitworks.jpg` |
| Small promo tile (optional) | 440×280 | `promo-small-440x280.jpg` |
| Marquee promo tile (optional) | 1400×560 | `promo-marquee-1400x560.jpg` |

Only the store icon and at least one screenshot are required; the promo tiles
are optional but improve placement.

The screenshots reproduce the real Guardian UI (the block screen, the in-app
"Turn on Safe Browsing" prompt, and the grown-up report), so they reflect
actual functionality — which the store review requires.

Source HTML for regenerating these lives in the session scratchpad
(`build-assets/`); re-render with headless Chrome at `--force-device-scale-factor=1`.
