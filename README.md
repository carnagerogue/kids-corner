# Kids Corner ☀️ — Summer Command Center

A fun, kid-friendly web app for **Claire 🌙, Coby 🚀, and Hailee ☀️** to run their
summer days at home. It's not just a school-assignment tracker — it's a full
summer command center with learning missions, creative projects, hands-on
crafts, outdoor adventures, and kid-friendly rewards.

## What's inside

- **🛰️ Command Center** — a home dashboard with a **schedule rail** on the left
  (a mini month calendar showing today's day/date, plus the day's timeline) and,
  on the right, the kid's **required curriculum app** (front and center), level,
  XP, streak, badges, any assigned chores, and a few **"Missions of the Day"** to
  choose from (with indoor and outdoor options so weather or supervision is never
  a blocker). (Each kid only sees their own corner.)
- **🗓️ Today's Schedule** — the family's daily rhythm (Breakfast → Study →
  Recess → Choice Studio → Lunch → Fun Learning → Clean Up → Free Time), shown
  on both the dashboard and its own tab. It **auto-tracks the day**: blocks mark
  themselves done as their time passes (no manual check-offs), the current block
  shows **● NOW**, and the next one is flagged **▶ Up next**. When it's time for
  a new block the app plays a **chime** and — if you tapped **🔔 Turn on
  reminders** — a notification + in-app toast. **Study Time links straight to the
  Applications page**.
- **🧭 Applications** — the apps a grown-up has turned on for that kid (their
  **main platform** plus learning tools), **today's assignment**
  based on the day of the week (Mon Math, Tue Code, Wed Science, Thu Civics, Fri
  Finish & Create), the house rules ("follow today's day only," plus Coby's
  25-min-work / 5-min-break rule), and the full weekly plan. Opening today's
  assignment puts the card into a **focus mode** ("🎯 Working now…") with a live
  timer that keeps Kids Corner as home base and nudges the kid back to submit
  photo proof — the schoolwork opens in a new tab (the platforms block
  embedding), so the app stays open underneath.
- **🎯 Mission Board** — a big library of activities (arts & crafts, drawing,
  building, outdoor, science, writing, music, brain games, family, kindness,
  quiet time). Filter by category, indoor/outdoor, difficulty, or "best for this
  kid." Each card has supplies and step-by-step instructions. A kid can also
  **do a mission with a friend** — pick another child on the platform, and when
  the photo is approved **both kids earn the XP**. (**Chores aren't here** — a
  grown-up assigns those; see below.)
- **🧹 Chores are parent-decided** — kids can't pick chores themselves. A
  grown-up assigns a chore to a specific kid in the Grown-Ups area, and it then
  shows up under **Today's Chores** on that kid's Command Center to finish with
  photo proof (just like any other task).
- **🎨 Pick Your Look** — each kid chooses a theme for the animated **cursor and
  background** from the Command Center: **Sparkle** (stars & rainbows),
  **Adventure** (rockets, dinos & lightning), or **Ocean** (fish & bubbles). The
  choice is saved per kid; Coby starts on Adventure, the others on Sparkle.
- **🌟 Explore** (inside the Applications page) — a browsable library of ~25
  hand-picked, free, kid-safe websites that are educational or just-plain-fun
  (Khan Academy, PBS Kids, NASA, Mystery Science, Storyline Online, Code.org,
  Chrome Music Lab, and more), filterable by category and opening in a new tab.
  Grown-ups can turn each site on or off **per kid** in the Grown-Ups area (all
  on by default).
- **🏆 Trophy Room** — levels with fun ranks (Sprout → Summer Hero), unlockable
  badges, streaks, and per-kid stats.
- **💬 Messages** — each kid has a private chat thread with the grown-ups, and
  the grown-ups reply from their dashboard. New messages **chime, raise a
  notification, and show a toast** the moment they arrive — even when Kids Corner
  is open in a **background tab** — and threads sync live across tabs in the same
  browser. (Same-browser only — there's no server, so it doesn't sync across
  different devices.)
- **🔒 Grown-Ups** — a PIN-gated dashboard where a parent reviews photo proof and
  **approves or sends back** each mission/assignment, **adds or removes kids**,
  **chooses which apps each kid can see**, **assigns chores**, **reads and
  replies to each kid's messages**, changes the PIN, and resets progress. The kid
  roster ships with Claire, Coby & Hailee but is fully editable.

## Logging in

The app opens to a **login screen**. Each kid taps their face and enters their
own PIN on a kid-friendly keypad. Once logged in they're locked to their own
corner — there's no avatar switcher, so they can't act as a sibling without
logging out and entering that sibling's PIN. A **Log out** button is in the top
bar. The session survives a page reload but clears when the browser closes, so
the next kid has to log in.

> **Starter kid PINs:** Claire `1111`, Coby `2222`, Hailee `3333`. Change them
> under **Grown-Ups → Kid Login PINs** and give each child a PIN only they know.
> Grown-ups have their own separate PIN (default `1234`).

## Proof & approval (no self-marking)

Kids **cannot** mark their own missions or daily assignments complete. Instead:

1. The kid taps **📸 Take photo to finish** and snaps a webcam photo of their work.
   (If the camera is unavailable, there's a photo-upload fallback.)
2. The task goes to **⏳ Waiting for a grown-up** — no XP yet.
3. A parent opens **🔒 Grown-Ups**, enters the PIN, sees the photo, and
   **Approves** (XP + badges awarded) or **Sends back** with an optional note so
   the kid can try again.

> **Default grown-up PIN is `1234`.** Change it under Grown-Ups → Settings. It's a
> light gate to keep kids out of the approval screen, not real security.

## Rewards system

- **XP is effort-based**: only **approved** missions and assignments earn XP.
  (It's derived only from approved photo-proof work, so it can't be faked.) The
  schedule auto-tracks the day but does **not** award XP.
- XP raises your **level / rank**.
- Milestones unlock **badges** (first mission, scholar, outdoor explorer, perfect
  day, streaks, and more).
- Activity in a day (schedule or approved work) keeps your **streak** alive.

Each kid's progress is saved automatically in the browser (localStorage), so it
persists between visits on the same device. No account or internet needed.

> **Camera note:** browsers only allow the webcam on a *secure* origin. Opening
> the app at `http://localhost:5173` works; opening it from another device via a
> `192.168.x.x` address will block the camera (the upload fallback still works).

## Local logins (optional)

The mandatory-curriculum cards can show copy-paste username/password buttons,
but logins are **never** committed to git or included in the public build. To
enable them locally:

```bash
cp src/data/credentials.local.example.ts src/data/credentials.local.ts
# then edit credentials.local.ts and fill in real logins
```

`src/data/credentials.local.ts` is gitignored. On the public GitHub Pages site
the cards simply show an **Open** button (the browser's saved password handles
the actual login), so no credentials are ever exposed.

## Running it

```bash
npm install
npm run dev      # start the dev server, then open the printed URL
```

To build a static version you can open anywhere:

```bash
npm run build
npm run preview
```

## Deploy (GitHub Pages)

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the app
and publishes it to GitHub Pages. The site is served from `/kids-corner/`
(configured via `base` in `vite.config.ts`). Enable it once under
**Settings → Pages → Source: GitHub Actions**.

## Customizing

- **Kids & colors** — `src/data/kids.ts`
- **Daily schedule** — `src/data/schedule.ts`
- **Mandatory curriculum & daily assignments** — `src/data/applications.ts`
- **Private logins (local only)** — `src/data/credentials.local.ts` (gitignored)
- **Activity library** — `src/data/activities.ts` (uses the `ActivityIdea` type
  in `src/types.ts`)
- **Levels & ranks** — `src/data/levels.ts`
- **Badges** — `src/data/badges.ts`
- **Cursor & background themes** — `src/data/themes.ts` (add a theme to the
  `THEMES` list and its id to the `ThemeId` type in `src/types.ts`)

Built with React + TypeScript + Vite.
