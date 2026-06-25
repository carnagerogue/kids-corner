# Kids Corner ☀️ — Summer Command Center

A fun, kid-friendly web app for **Claire 🌙, Coby 🚀, and Hailee ☀️** to run their
summer days at home. It's not just a school-assignment tracker — it's a full
summer command center with learning missions, creative projects, hands-on
crafts, outdoor adventures, and kid-friendly rewards.

## What's inside

- **🛰️ Command Center** — a home dashboard showing each kid's level, XP, streak,
  badges, today's progress (including anything **waiting for approval**), and a
  featured "Mission of the Day."
- **🗓️ Today's Schedule** — the family's daily rhythm (Breakfast → Study →
  Recess → Choice Studio → Lunch → Fun Learning → Clean Up → Free Time). The
  current block highlights live, checking off a block earns XP, and **Study Time
  links straight to the Applications page**.
- **🧭 Applications** — each kid's **mandatory curriculum** (Claire → Edgenuity
  with her login, Coby → Ascend Math, Hailee → Coursera), **today's assignment**
  based on the day of the week (Mon Math, Tue Code, Wed Science, Thu Civics, Fri
  Finish & Create), the house rules ("follow today's day only," plus Coby's
  25-min-work / 5-min-break rule), and the full weekly plan.
- **🎯 Mission Board** — a big library of activities (arts & crafts, drawing,
  building, outdoor, science, writing, music, brain games, family, kindness,
  quiet time). Filter by category, indoor/outdoor, difficulty, or "best for this
  kid." Each card has supplies and step-by-step instructions. (**Chores aren't
  here** — a grown-up assigns those; see below.)
- **🧹 Chores are parent-decided** — kids can't pick chores themselves. A
  grown-up assigns a chore to a specific kid in the Grown-Ups area, and it then
  shows up under **Today's Chores** on that kid's Command Center to finish with
  photo proof (just like any other task).
- **🏆 Trophy Room** — levels with fun ranks (Sprout → Summer Hero), unlockable
  badges, streaks, and per-kid stats.
- **🔒 Grown-Ups** — a PIN-gated dashboard where a parent reviews photo proof and
  **approves or sends back** each mission/assignment, **assigns chores** to each
  kid, changes the PIN, and resets progress.

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

- **Approved** missions and assignments — plus schedule check-offs — earn **XP**.
  (XP is derived only from approved work, so it can't be faked.)
- XP raises your **level / rank**.
- Milestones unlock **badges** (first mission, scholar, outdoor explorer, perfect
  day, streaks, and more).
- Activity in a day keeps your **streak** alive.

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

Built with React + TypeScript + Vite.
