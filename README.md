# Powerlifting Hub

An offline-first web app for managing your powerlifting cycles. Pick a program, set your 1RM, and the app generates the week-by-week schedule with rounded loads in kg or lbs. Designed for the gym: dark theme, big tap targets, installable as a PWA, no internet needed once cached.

No backend, no accounts, no tracking. Your data lives in `localStorage` and never leaves the device unless you export it.

Built with **React + TypeScript** and bundled by **Vite** into a plain static site — the deployable output is just HTML/CSS/JS, served exactly like any static folder.

## What it does

- **Programs out of the box** — 3-Day and 2-Day base building, classic peaking (max test), RPE Focus (3-day / 2-day), RPE peaking, plus three pull-up specific programs (Double Progression, Low-Vol Peaking, Fighter ladder).
- **Per-lift configuration** — each exercise (bench, squat, deadlift, OHP, pull-up by default; add/edit/delete your own) has its own 1RM, program, backoff variation, cycle increment, and which programs/variations are even visible in the cycler.
- **Swipe between lifts** — on touch screens, swipe left/right anywhere on the main program to move to the next/previous exercise tab (arrow keys do the same on desktop).
- **Auto-progression** — the *Complete Block & Recalculate* button bumps the 1RM by the configured increment, resets the cycle's checkboxes, and the week table re-renders with the new loads.
- **Custom load override** — long-press a row (right-click on desktop) to log the exact weight you actually used. The calculated value is replaced in-place with a wrench icon next to it. *Reset* in the prompt clears the override back to the calculated load; tapping outside the prompt (or ✕ / Esc) closes it unchanged. Logged values are auto-cleared on PR change so they never silently mismatch the percentages.
- **Unit + rounding cycle** — toggle kg / lbs (uses plate-math conversion, not naive ×2.2046, so the converted 1RM is loadable on a real bar) and choose exact / round-up / round-down for percentage targets.
- **Weekly Planner + Month Calendar** — drag (or tap-then-tap) workouts onto specific days of any week. Auto-assign laydown using your Master Split is one click. Days with assigned-but-undone work show blue; fully-done days show green. Every program pill has a "show in program" button that jumps to that exact row on the main page and highlights it (the highlight fades once you scroll or tap).
- **Custom workouts** — add your own one-off workouts (a name plus an optional note) straight into the Weekly Planner with the *+ Custom* button. They land in the Unassigned pool, then tap-then-tap onto any day alongside the program-generated workouts; they track done/undone, colour the month calendar, and surface in *Today's Workout* just like the rest.
- **Today's Workout** — one button shows everything due on the day as a single mixed-exercise table (Weekly Planner assignments first, Master Split fallback with a program-week prompt). A ‹ › date pager steps backward/forward a day at a time to review past sessions or preview upcoming ones; tap the date label to jump back to today.
- **Master Split editor** — build your own weekly template: the pool of workouts is derived live from each exercise's selected program (rest days excluded), and you tap-then-tap (or drag) them onto weekdays. The split drives the Planner's one-click auto-assign. "Reset" restores the default layout.
- **Fatigue Manager** — estimates weekly working sets per muscle group from each lift's current program and grades it against per-muscle volume landmarks (MEV/MRV) you can tune to your own recovery. Accounts for *peripheral fatigue*: muscles a lift only trains secondarily (e.g. triceps & front delts on bench) count at an adjustable fraction of a working set (default 0.5, set in Settings). The muscle each lift trains is fully editable per exercise.
- **Design module (navigation customization)** — Settings → Design is a full layout editor for the nav. Send each button (Today's Workout, Fatigue, Schedule, Planner, Settings, PO Box, RPE Guide) to the **top** icon bar or a **bottom** bar, **hide** the ones you don't use, and reorder them with the arrows. Hidden buttons are revealed by a control you place yourself — a *Show hidden buttons* toggle in Settings (default), or a ⋯ button in the nav. Settings can be moved but never hidden, so the panel is always reachable. A *Thumb reach* preset drops everything to the bottom bar in one tap.
- **Floating buttons** — also in Settings → Design. Optionally show **Today's Workout as a big button in the centre of the bottom** while you still have planner workouts left for the day; once they're all done it hides and Today's Workout moves back into the navigation. The scroll-to-top and go-to-training floating buttons can each be turned off here too.
- **Customizable lift controls** — Settings → Design ▸ *Lift controls* reorders the controls under the exercise tabs (1 Rep Max, Program Type, Backoff Variation, Lift Adjustments, Warm-up, Loads) or hides the ones you don't use. The *Loads* button (which flips loads between Detailed exact-kg-plus-% and Rough round gym numbers) is hidden by default to keep the row tidy.
- **One-handed (thumb) layout** — alongside the Design module's bottom bar, Settings → Display puts the sub-page Back button as a floating lower-left control and offers a slider for how far down prompts open; the *Thumb reach* preset moves both toward the thumb too.
- **RPE/RIR Guide** as a built-in reference view.
- **Backup / restore** — Settings → Data → Export dumps the entire state as JSON; Import restores it. No cloud round-trip.

## Install as a PWA

Open the app in Chrome / Edge / Safari and pick "Install app" or "Add to Home Screen". A Workbox service worker (via `vite-plugin-pwa`) precaches the content-hashed build so the app works offline and loads instantly; because the filenames are hashed, a new deploy ships new files and the service worker picks them up, then an in-app banner offers to refresh.

## Development

The app needs a build step now (Node 18+):

```sh
npm install      # one-time
npm run dev      # Vite dev server with hot-reload at http://localhost:5173
npm run build    # typecheck + bundle to dist/  (this is what you deploy)
npm run preview  # serve the built dist/ locally to sanity-check the bundle
npm test         # Vitest suite for the pure training-math core
```

`npm run build` emits a static `dist/` folder — that is the entire deployable artifact.

## Hosting it for others

The app is fully static and client-side, so you can host it for anyone: **every visitor is served the same default build, and every change they make stays in their own browser's `localStorage`** — there is no backend, no accounts, and no shared state. Out of the box a first-time visitor lands on a ready-to-train default: squat / bench / deadlift / OHP / pull-up loaded with sensible 1RMs and programs, a Master Split, and a clean bottom-bar navigation. A reference [nginx config](deploy/nginx.conf) (security headers, gzip, cache rules) is included for self-hosting. A baseline Content-Security-Policy ships in the page itself, so it is safe to serve even from a bare static host.

## Data model

Everything lives under one `state` object in `localStorage` (key: `pl_state`):

| field                | shape                                       | what it holds                                        |
| -------------------- | ------------------------------------------- | ---------------------------------------------------- |
| `global`             | `{ unit, rounding, calendarWeek, navPosition, backPosition, dialogOffset, roughLoads, showLoadsToggle, nav }` | unit (`'kg'`/`'lbs'`), rounding mode, planner block, legacy nav flag, top/bottom back button, dialog vertical position (vh), `roughLoads` (Detailed vs Rough loads), `showLoadsToggle` (whether the Loads button is shown on the main page — off by default), `nav` — the Design module's `{ order, layout, revealControl, showHidden, fabs }` (per-button placement `top`/`bottom`/`hidden`, ordering, how hidden buttons are revealed, and `fabs` floating-button toggles `{ today, scrollTop, goToTraining }`); and `controls` — the main-page lift controls' `{ order, layout }` (per-control `show`/`hidden` + ordering) |
| `activeLift`         | string                                      | currently selected exercise tab                      |
| `exercises`          | string[]                                    | order of exercise tabs                               |
| `lifts`              | `{ [lift]: { max, program, variation, block } }` | per-lift 1RM, active program/variation, and `block` — the training-cycle counter (see rowId note below) |
| `variationsDict`     | `{ [lift]: string[] }`                      | named backoff variations per lift                    |
| `allowedPrograms`    | `{ [lift]: string[] }`                      | which programs the cycler will expose for that lift  |
| `allowedVariations`  | `{ [lift]: number[] }`                      | which variation indices are enabled                  |
| `increments`         | `{ [lift]: number }`                        | how much to add to the 1RM on Complete Block         |
| `completed`          | `{ [rowId]: true }`                         | done-checkboxes (`rowId = lift-program-wN-dN`, plus `-bN` for repeat blocks) |
| `logged`             | `{ [rowId]: { main, backoff, ... } }`       | custom weights set via long-press, in current unit   |
| `calendar`           | `{ [rowId]: 'YYYY-MM-DD' \| 'hidden' }`     | planner assignments (program rows **and** `cw-` custom workouts) |
| `customWorkouts`     | `{ [cw-id]: { name, note } }`               | user-defined ad-hoc planner workouts; placement reuses `calendar`, done-state reuses `completed`, under the same `cw-` id |
| `masterSplit`        | `{ [weekday 0–6]: [{ ex, d }] }`            | weekly split template (weekday → exercise+day slots) |
| `fatigue`            | `{ peripheralFactor, week, muscleMap, tolerance }` | peripheral-set factor, selected block week, per-lift `{ primary[], secondary[] }` muscle map, and per-muscle `{ mev, mrv }` volume landmarks |

**rowIds and training blocks.** A `rowId` keys a single workout across `completed`, `logged`, and `calendar`. Its base form is `lift-program-wN-dN`. Each time a lift's **Complete Block & Recalculate** runs, that lift's `block` counter increments and new rows are keyed with a trailing `-bN` suffix (block 0 — the first cycle — omits it). That namespacing is what lets a fresh block start clean *without* overwriting or orphaning the previous block's dates and logged weights: old cycles keep their `-b0`/`-b1`/… keys and stay visible on the calendar by their real dates. `makeRowId`/`rowIdBlock` (`src/lib/calc.ts`) are the single source of truth for the format — build and parse rowIds through them, never by hand.

Schema changes are handled by idempotent migrations on load — adding new programs/variations to existing users without clobbering their data. Keep that pattern when extending the schema.

## Backing up your data

`Settings → Data → Export` writes a `benchapp-YYYY-MM-DD.json` file containing the entire `state`. Import the same file on another device (or after clearing site data) to restore.
