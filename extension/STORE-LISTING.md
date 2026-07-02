# Chrome Web Store listing — Luminara Guardian

Copy/paste these into the Web Store **Developer Dashboard** when you upload
`kids-corner-guardian-0.1.0.zip`. (This file is not part of the extension — it's
excluded from the ZIP.)

---

## Store listing tab

**Item name**
Luminara Guardian

**Summary** (≤132 chars)
Keeps a child's browser on the learning apps a grown-up allowed in Luminara, and reports their time on task.

**Category**
Workflow & Planning  _(or "Education" if offered)_

**Language**
English

**Description**
> Luminara Guardian turns a child's browser into a focused learning space.
>
> A grown-up chooses which educational apps each child can use in Luminara
> (Scratch, Prodigy, PhET, Edgenuity, and more). The Guardian then keeps that
> child's browser on those apps: any other website is gently redirected to a
> friendly "ask a grown-up" screen, while the allowed apps work normally.
>
> It also gives grown-ups a simple report of time on task — how long the child
> spent in each app, which apps they opened, and any sites that were blocked —
> right inside the Luminara dashboard.
>
> • No accounts, no ads, no third-party tracking.
> • Turns itself on automatically once the child signs in to Luminara — no
>   codes to enter.
> • The learning data stays in your family's own private space and is visible
>   only to you.
>
> Best on a Chromebook or computer. For a lock a child can't remove, force-install
> it on a managed Chromebook. (On iPad, use Apple Screen Time — Luminara shows
> you how.)
>
> Set up your family free at https://kids-corner-45fc2.firebaseapp.com

**Official URL / homepage**
https://kids-corner-45fc2.firebaseapp.com

**Screenshots** (need at least one 1280×800 or 640×400)
Suggested: (1) the block screen (open the extension's `blocked.html`), (2) the
"Safe Browsing" report in the grown-up dashboard, (3) the child's "Turn on Safe
Browsing" prompt.

---

## Privacy tab (required — do this carefully; it's a kids' data extension)

**Privacy policy URL**
https://kids-corner-45fc2.firebaseapp.com/privacy.html

**Single purpose**
Restrict a child's browsing to the educational apps a parent allowed in Kids
Corner, and report the child's time-on-task to that parent.

**Permission justifications**
- **host permission `<all_urls>`** — The extension must inspect and redirect
  top-level navigations on any site so it can send the browser back to Kids
  Corner whenever the child tries to open a site the grown-up hasn't allowed.
- **declarativeNetRequest** — Used to block/redirect navigation to non-allowed
  sites via rules generated from the parent's allow-list (no request contents
  are read).
- **tabs** — To read the active tab's site so time-on-task is attributed to the
  right learning app.
- **idle** — To count only *active* time (pause the timer when the child steps
  away).
- **webNavigation** — To note which allowed app was opened and which site was
  blocked.
- **alarms** — A once-a-minute timer for the time-on-task tally.
- **storage** — To hold the current allow-list and the day's activity tally on
  the device.

**Remote code**
Select **"No, I am not using remote code."** All of the extension's code is
bundled in the package; it loads no external scripts, uses no `eval`, and pulls
in no remote modules. (The postMessage handshake with the Luminara page
exchanges *data* — the allow-list and activity — never code.)

**Data usage disclosures** (must match the privacy policy)
- **Data types collected** — check **Web history** (which allowed apps were
  opened, and the domain of blocked attempts) and **User activity** (active time
  per app). Do NOT check any other category — no personally identifiable info,
  no authentication info, no financial info, no page content, no keystrokes.
- **Certifications** — check all three (they are all true):
  1. I do **not** sell or transfer user data to third parties, outside of the
     approved use cases.
  2. I do **not** use or transfer user data for purposes unrelated to my item's
     single purpose.
  3. I do **not** use or transfer user data to determine creditworthiness or for
     lending purposes.

## Account → Settings (one-time, per publisher account)
- **Contact email** — required before you can publish anything. Enter an email
  you monitor, then **verify** it (Google sends a confirmation link). This is a
  publisher-account setting, separate from the item.

> Note: extensions that request broad host permissions and handle children's
> data get extra review. Expect questions; the answers are all above and in
> `privacy.html`.
