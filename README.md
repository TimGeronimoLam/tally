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
2. Run `supabase/migrations/20261012000000_init.sql`, then `20261012000001_grants.sql`, in the dashboard SQL Editor
   (or `supabase link` + `supabase db push` with the CLI).
3. Authentication → Sign In / Providers → enable **Anonymous sign-ins**.
   Optionally enable the Turnstile captcha under Attack Protection to keep
   junk anonymous users out.
4. Copy `.env.example` to `.env.local` and paste the Project URL and anon key
   from Project Settings → API. Restart `npm run dev`.

5. For the nightly cleanup of stale anonymous users, enable the **pg_cron**
   extension (Database → Extensions) and run
   `supabase/migrations/20261012000003_purge_anonymous.sql`.
6. Authentication → URL Configuration: set **Site URL** to where the app is
   served and add it to **Redirect URLs** (plus `http://localhost:5173` for
   dev), so confirmation and magic-link emails land back in the app.

How sync works (`src/sync/`): on sign-in, on each local change (debounced),
on tab focus and on reconnect, the app pulls rows with `updated_at` newer than
the last pull, merges them (latest `deleted_at` wins; unsynced local edits to
an exercise's name/unit win), then pushes rows without `syncedAt`. Users sign in
with an email magic link, or not at all. Joining a challenge without an
account silently creates an anonymous Supabase user; the UI never calls it
that, and a later email sign-in upgrades that same user in place so nothing is
orphaned. Sign out keeps local data; signing in as a different user resets the
sync markers so everything is pushed to the new account.

Free-tier projects pause after a week of inactivity; the Restore button is on
the project's dashboard home.

## Deploy

Static build, no server of its own. Either host works; push to `main` and let
it build.

- **Cloudflare Workers** (what the dashboard's "Create an app" flow sets up):
  connect the repo, keep build command `npm run build` and deploy command
  `npx wrangler deploy`. `wrangler.jsonc` serves `dist/` as static assets with
  SPA fallback, so deep links like `/join/CODE` work. Under Advanced settings →
  Build variables add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the
  build bakes them in). `.node-version` pins the build to Node 24.
- **Cloudflare Pages** (older flow): build `npm run build`, output `dist`, same
  env vars under Settings → Environment variables. `public/_redirects` handles
  deep links there.
- **Vercel**: Import the repo (framework preset Vite), add the same env vars.
  `vercel.json` holds the SPA rewrite.

After the first deploy: put the site URL into Supabase → Authentication →
URL Configuration (Site URL + Redirect URLs) so email links land in the app.

## PWA notes

- Service worker is only generated on `build`; test install with `npm run preview`.
- Manifest and Workbox config live in `vite.config.ts`.
- Icons are generated placeholders; replace `public/pwa-*.png` and `apple-touch-icon.png` with real artwork.
