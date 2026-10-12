# Tally

Minimal workout-stats PWA. Logging a set takes one tap and one number.
See [PLAN.md](PLAN.md) for the roadmap.

## Stack

Vite + React + TypeScript · Tailwind v4 · react-router · vite-plugin-pwa (Workbox)

## Scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Dev server with HMR                           |
| `npm run build`     | Typecheck + production build to `dist/`       |
| `npm run preview`   | Serve `dist/` (use this to test the PWA/SW)   |
| `npm run lint`      | oxlint                                        |
| `npm run typecheck` | `tsc -b`                                      |
| `npm run format`    | Prettier write / `format:check` to verify     |
| `npm run icons`     | Regenerate placeholder PNG icons in `public/` |

## Design

Screens follow the Tally design canvas: https://claude.ai/artifact/6T6fTGkoBAK7KiVJiwqGN9

Tokens (colors, radii, shadows) are CSS variables in `src/index.css`, exposed to
Tailwind via `@theme inline` so utilities like `bg-surface` / `text-muted` follow
the active theme. Light and dark are switched by `data-theme` on `<html>`.
The whole app sits in a centered column capped by `--container-app` (430px), so
desktop windows show a phone-shaped layout with side borders instead of a
stretched UI. Fixed overlays (toast, sheet) share the same cap.

## Project structure

| Path                  | What lives there                                                          |
| --------------------- | ------------------------------------------------------------------------- |
| `src/components/ui/`  | Design-system primitives. No data access. Button, Chip, Sheet, Keypad…    |
| `src/components/app/` | Composites that know the data model: TabBar, ExerciseChips, ExerciseSheet |
| `src/routes/`         | One file per screen. Screens compose `app` + `ui` and call `db` hooks     |
| `src/db/`             | Dexie schema, types, mutations, live-query hooks, import/export           |
| `src/lib/`            | Pure helpers: `cn`, `format`, `date`, `theme`, `toast` hook               |

Rule of thumb: if a component needs `db`, it belongs in `app` or `routes`, never `ui`.

## PWA notes

- Service worker is only generated on `build`; test install with `npm run preview`.
- Manifest and Workbox config live in `vite.config.ts`.
- Icons are generated placeholders; replace `public/pwa-*.png` and `apple-touch-icon.png` with real artwork.
