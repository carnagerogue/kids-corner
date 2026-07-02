# Kids Corner Guardian

A browser extension that keeps a child's browser on the **learning apps a
grown-up allowed** in Kids Corner, and reports **time-on-task** back to the
parent dashboard. It's a _practical guardrail_, not a tamper-proof lock — for
hard enforcement, pair it with a managed Chromebook policy or OS parental
controls (see "Making it unremovable" below).

## How it works

- The **content script** runs only on Kids Corner pages and does a small
  `postMessage` handshake with the page. The page (which is signed in) hands
  the extension the **allow-list** for the child currently logged in — the
  domains of their enabled apps + the auth/CDN hosts those apps need + Kids
  Corner itself.
- The **background** service worker enforces **default-deny**: any top-level
  navigation to a domain not on the list is redirected to a friendly
  `blocked.html`. Sub-resources aren't blocked, so allowed apps still work.
- It measures **active time per app** (idle-aware), **which apps were opened**,
  and **which sites were blocked**, as small daily aggregates. The page reads
  those over the same handshake and writes them to the family's Firebase, so the
  extension holds **no credentials**.

## Load it for testing (unpacked)

1. Chrome/Edge → `chrome://extensions` → turn on **Developer mode**.
2. **Load unpacked** → select this `extension/` folder.
3. Open Kids Corner and log in as a child. The dashboard's **Safe Browsing**
   card should flip to "Protected ✓". Try visiting `youtube.com` — you'll get
   the block screen.

Firefox: `about:debugging` → **This Firefox** → **Load Temporary Add-on** →
pick `manifest.json`.

## Publishing (so parents can one-click install)

1. Create a **Chrome Web Store developer account** (one-time \$5 fee).
2. Zip the contents of this folder and upload it.
3. After review, copy the store URL + the extension ID into the app:
   set `GUARDIAN_STORE_URL` in `src/lib/guardian.ts`.

## Making it unremovable (hard enforcement)

- **Chromebook / managed Chrome:** force-install via the
  `ExtensionInstallForcelist` policy and add `URLAllowlist`/`URLBlocklist`. The
  child can't remove it.
- **iPad:** extensions like this can't run on iOS — use Apple **Screen Time →
  Content & Privacy → Web Content → Allowed Websites**, plus **Guided Access**.
  Kids Corner shows the parent how.

## Notes / follow-ups

- The allow-list is currently handed to the extension by the page. A
  devtools-savvy child could spoof it — acceptable at the "practical guardrail"
  bar. Phase 2 hardening: have the extension fetch the allow-list from Firebase
  itself against a paired token.
- Icons are omitted (Chrome uses a default); add branded PNGs under `icons/` and
  reference them in `manifest.json` before publishing.
