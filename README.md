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

## Supabase (sync + challenges)

Optional. Without it the app is fully local.

1. Create a project at https://supabase.com.
2. Run `supabase/migrations/20261012000000_init.sql` in the dashboard SQL Editor
   (or `supabase link` + `supabase db push` with the CLI).
3. Authentication → Sign In / Providers → enable **Anonymous sign-ins**.
   Optionally enable the Turnstile captcha under Attack Protection to keep
   junk anonymous users out.
4. Copy `.env.example` to `.env.local` and paste the Project URL and anon key
   from Project Settings → API. Restart `npm run dev`.

Free-tier projects pause after a week of inactivity; the Restore button is on
the project's dashboard home.

## PWA notes

- Service worker is only generated on `build`; test install with `npm run preview`.
- Manifest and Workbox config live in `vite.config.ts`.
- Icons are generated placeholders; replace `public/pwa-*.png` and `apple-touch-icon.png` with real artwork.
