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
| `src/i18n/`           | Languages. `en.ts` is the typed source; every other locale must match it  |
| `src/sync/`           | Supabase auth and sync                                                    |
| `src/reminders/`      | Daily push reminder: subscribe, save the row, repair it on launch         |
| `src/sw.ts`           | Service worker: offline precache plus the reminder's push handlers        |
| `worker/`             | Cloudflare Worker: serves `dist/`, sends the reminders from a cron        |

Rule of thumb: if a component needs `db`, it belongs in `app` or `routes`, never `ui`.

## Languages

English, German, French, Spanish, Italian, Dutch and Portuguese. The app
follows the device language (Account → Language overrides it; stored as
`tally.locale`). Dates, numbers and weekday names come from `Intl` with the
same locale, so an `en-GB` phone keeps its date order.

Components call `useT()` and read `t.screen.key`; code outside React calls
`messages()`. Strings that need values are functions, so each language owns
its own plurals and word order. To add a language: copy `src/i18n/en.ts`,
type the object as `Messages`, and register it in `LOCALES` and `MESSAGES`
in `src/i18n/locale.ts`. `tsc` reports any key that is missing.

## Supabase (sync + challenges)

Optional. Without it the app is fully local.

1. Create a project at https://supabase.com.
2. Run `supabase/migrations/20261012000000_init.sql`, then `20261012000001_grants.sql`,
   `20261012000002_challenges.sql`, `20261012000004_challenge_host_actions.sql`,
   `20261012000005_my_challenges_server_now.sql`,
   `20261013000000_leave_and_edit_challenge.sql`,
   `20261013000001_lock_challenge_members.sql`,
   `20261013000002_builtin_exercises.sql` and (for reminders, see below)
   `20261014000000_push_reminders.sql`, in the dashboard SQL Editor (or `supabase link` + `supabase db push` with the CLI).
3. Authentication → Sign In / Providers → enable **Anonymous sign-ins**.
   To keep junk anonymous users out, turn on the Turnstile captcha, see
   "Captcha" below.
4. Copy `.env.example` to `.env.local` and paste the Project URL and anon key
   from Project Settings → API. Restart `npm run dev`.

5. For the nightly cleanup of stale anonymous users, enable the **pg_cron**
   extension (Database → Extensions) and run
   `supabase/migrations/20261012000003_purge_anonymous.sql`.
6. Authentication → URL Configuration: set **Site URL** to where the app is
   served and add it to **Redirect URLs** (plus `http://localhost:5173` for
   dev); Supabase requires it even though the sign-in emails carry no link.
7. Authentication → Emails → Templates: replace the body of the
   **Confirm signup**, **Magic Link** and **Change Email Address** templates
   with a code-only email, e.g.

   ```html
   <h2>Your Tally sign-in code</h2>
   <p>Enter this code in the app to sign in:</p>
   <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; font-family: monospace;">{{ .Token }}</p>
   <p>The code expires shortly and can only be used once. If you did not request it, ignore this email.</p>
   ```

   The app asks for this code after sending the email and never mentions a
   link. Links are useless on iPhone: iOS opens every link in Safari, never
   in a home-screen web app, and the two do not share a session, so a
   `{{ .ConfirmationURL }}` link could never sign the installed app in.
   Without `{{ .Token }}` in the template the code step cannot complete.

How sync works (`src/sync/`): on sign-in, on each local change (debounced),
on tab focus and on reconnect, the app pulls rows with `updated_at` newer than
the last pull, merges them (latest `deleted_at` wins; unsynced local edits to
an exercise's name/unit win), then pushes rows without `syncedAt`. Users sign in
with an emailed one-time code (the email carries no link; see step 7 above),
or not at all. Joining a challenge without an
account silently creates an anonymous Supabase user; the UI never calls it
that, and a later email sign-in upgrades that same user in place so nothing is
orphaned. Sign out keeps local data; signing in as a different user resets the
sync markers so everything is pushed to the new account.

Free-tier projects pause after a week of inactivity; the Restore button is on
the project's dashboard home.

## Deploy

Static build; the only server code is the Cloudflare Worker's reminder cron.
Either host works for the app; push to `main` and let it build.

- **Cloudflare Workers** (what the dashboard's "Create an app" flow sets up):
  connect the repo, keep build command `npm run build` and deploy command
  `npx wrangler deploy`. `wrangler.jsonc` serves `dist/` as static assets with
  SPA fallback, so deep links like `/join/CODE` work. Under Advanced settings →
  Build variables add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_VAPID_PUBLIC_KEY` and `VITE_TURNSTILE_SITE_KEY` (the build bakes
  them in). `.node-version` pins the build to Node 24.
- **Vercel**: Import the repo (framework preset Vite), add the same env vars.
  `vercel.json` holds the SPA rewrite. No cron there, so no daily reminders.

After the first deploy: put the site URL into Supabase → Authentication →
URL Configuration (Site URL + Redirect URLs).

Invite links (`/join/CODE`) have the iOS limit described above: on an
iPhone they open in Safari, not in the installed app. The join page then
shows the code with a Copy button and tells the user to enter it in the
app's Challenges tab, where the code field already lives.

## Captcha

Cloudflare Turnstile guards the Auth calls that mint accounts or send
email: the silent anonymous sign-in (joining or creating a challenge,
turning the reminder on) and the sign-in code. Supabase verifies the
token itself; the app only ever sees the public site key.

1. In the Cloudflare dashboard create a Turnstile widget (Managed mode)
   with the domains the app is served from. Add `localhost` to a separate
   dev widget, or use the always-passing test pair below.
2. Supabase → Authentication → Attack Protection → **Enable Captcha
   protection**, provider **Turnstile**, paste the widget's **secret key**.
3. Set `VITE_TURNSTILE_SITE_KEY` to the widget's site key in `.env.local`
   and as a build variable on Cloudflare (Workers → tally → Settings →
   Build → Variables and secrets, next to `VITE_SUPABASE_URL`), then push
   or redeploy so the build bakes it in.

Order matters: once step 2 is on, every build without a site key fails to
sign in ("Could not confirm you are human"). Without step 2, a site key is
harmless.

The widget stays invisible while Cloudflare is satisfied and only pops up
above the tab bar when it wants a tap (`src/lib/captcha.ts`). Each
sign-in fetches a fresh token; the token is single use. Signing in with a
code (`verifyOtp`) and attaching an email to an anonymous user
(`updateUser`) are not behind the captcha, so a join followed by an email
sign-in asks at most twice.

Local development: Cloudflare's test site key `1x00000000000000000000AA`
always passes and its test secret `1x0000000000000000000000000000000AA`
goes into Supabase; swap both for the real pair before going live. Cloudflare
refuses a real widget on a domain it does not know (error 110200 in the
console).

## Daily reminder (push)

Account → Reminders → Daily reminder sends one notification a day at the
chosen time, skipped when that day already has a synced entry. It is per
device: each phone has its own switch and time. Works on Android and
desktop Chrome/Edge/Firefox, and on iOS 16.4+ only from the Home Screen app
(in a Safari tab the row says "Install Tally first").

How it works: the app subscribes to Web Push and stores the subscription in
`push_subscriptions` (the push service's endpoint URL and keys, time, time
zone, language, app origin). With no session, turning it on silently creates
an anonymous user, as joining a challenge does; the account card still says
"Local only". Every 15 minutes the Worker's cron (`worker/index.ts`) calls
`due_reminders()`, which picks and claims the due rows in each one's own
time zone (2-hour grace window, never twice a day), sends each an encrypted
push with VAPID, and deletes rows the push service reports gone (404/410).
`src/sw.ts` shows the notification; a tap opens the app.

Setup, once (needs the Cloudflare Workers deployment):

1. `node scripts/gen-vapid.mjs` prints a public and a private key.
2. Public key → `VITE_VAPID_PUBLIC_KEY` in `.env.local` and in Cloudflare →
   Build variables. Without it the row says "Not supported here".
3. Cloudflare → Workers → tally → Settings → Variables and Secrets, as
   secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
   `VAPID_SUBJECT` (`mailto:you@example.com`), `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API keys → the
   secret key; never in the repo or a `VITE_` variable).
4. Run `supabase/migrations/20261014000000_push_reminders.sql` in the SQL
   Editor.
5. Push `main`. The cron shows under the Worker's Settings → Triggers; Logs
   show one `reminders: due …, sent …` line per run that had work.

Try the cron locally: put the five secrets in `.dev.vars` (git-ignored), run
`npx wrangler dev --test-scheduled`, then
`curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"`.

Limits: entries logged but not yet synced (phone offline) do not count, so
the reminder still comes. Delivery is best effort; battery savers can delay
it. A permission denied in the prompt can only be undone in system settings.
Signing out or deleting all data turns the reminder off.

## PWA notes

- Service worker is only generated on `build`; test install with `npm run preview`.
- Manifest and precache config live in `vite.config.ts`; the service worker itself is `src/sw.ts` (injectManifest).
- Icons are rendered from the logo in the design canvas by `npm run icons` (`scripts/gen-icons.mjs`); `public/logo.svg` is the mark for in-app use.
