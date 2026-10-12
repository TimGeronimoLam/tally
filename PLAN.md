# Tally – Implementation Plan

Tally is a minimal workout-stats PWA for Android and iOS. Logging a set takes one tap and one number. No accounts required; data is local-first, with optional sync and anonymous-account challenges via Supabase.

**Design:** https://claude.ai/artifact/6T6fTGkoBAK7KiVJiwqGN9 (canvas with all core screens, light + dark)

**Stack:** Vite + React + TypeScript · Dexie (IndexedDB) · vite-plugin-pwa · Supabase (Postgres, Auth, Realtime) · Cloudflare Pages or Vercel

Each phase ends with something usable on a phone.

---

## Phase 0 – Foundations (half a day)

- [x] `npm create vite@latest tally -- --template react-ts`
- [x] Add Tailwind (or vanilla CSS), oxlint (Vite default, replaces ESLint), Prettier
- [x] Add `vite-plugin-pwa`
  - Manifest: name, icons, `display: standalone`, theme color
  - Workbox precaching of the app shell
- [ ] Verify "Add to Home Screen" on Android Chrome and iOS Safari
- [ ] Deploy from `main` to Cloudflare Pages or Vercel so every push is live
- [x] Routing: bottom tab bar with Log / Stats / Challenges / Achievements, plus a Settings route

---

## Phase 1 – Local data model and logging (1–2 days)

### Dexie schema

| Table       | Fields                                                                                  |
| ----------- | --------------------------------------------------------------------------------------- |
| `exercises` | `id (uuid)`, `name`, `unit`, `createdAt`, `deletedAt?`, `syncedAt?`                     |
| `entries`   | `id (uuid)`, `exerciseId`, `amount`, `loggedAt`, `createdAt`, `deletedAt?`, `syncedAt?` |
| `meta`      | key/value: `deviceId`, `lastSyncAt`, settings                                           |

Entries are immutable apart from `deletedAt` (soft delete). Stats are always derived, never stored. UUIDs are generated client-side so IDs never collide across devices.

### Tasks

- [x] Seed default exercises on first launch (Pushups, Squats, Pull-ups, Plank)
- [x] Log screen
  - Exercise chips (horizontal row, "+" chip at the end)
  - Number input with `inputMode="numeric"` and autofocus
  - Log button; field clears after logging
  - Today's total for the selected exercise
  - Toast "25 pushups logged" with Undo (soft-deletes the entry)
- [x] Add / edit / archive exercise via the "+" chip (edit: tap the active chip)
- [x] Use `useLiveQuery` from `dexie-react-hooks` so all screens update reactively

**Milestone:** log workouts on your phone, fully offline.

---

## Phase 2 – Stats (2 days)

- [ ] Pure function `computeStats(entries, exerciseId | 'all', today)` returning:
  - today, this week, all-time total, best day
  - current streak, longest streak
  - Use the device-local date string (`YYYY-MM-DD`) as the day key everywhere
  - Unit-test streak logic across midnight and timezones
- [ ] Heatmap component
  - 53 columns × 7 rows of small squares in a horizontally scrollable container, scrolled to the right by default
  - Intensity by quantile of daily totals (one huge day shouldn't flatten the rest)
  - Tap a day → bottom sheet listing that day's entries
- [ ] Exercise toggle (All / single exercise) above the heatmap
- [ ] 7 / 30-day bar chart (plain divs with heights; no chart library)

---

## Phase 3 – Achievements (1 day)

- [ ] Define achievements as data: `{ id, title, description, check: (stats, entries) => boolean }`
- [ ] Evaluate after every log; store unlocked IDs with timestamp in Dexie
- [ ] Badge grid, locked badges greyed out
- [ ] Small celebration toast on unlock
- [ ] Initial set (~12):
  - Milestones: 100 / 1,000 / 10,000 reps
  - Streaks: 7 / 30 / 100 days
  - Consistency: logged 7 days in a row, 5 exercises tracked
  - Social (placeholders until Phase 5): first challenge joined, first won, invited 3 people

**Milestone:** the complete offline app. Share the URL with friends before touching Supabase.

---

## Phase 4 – Supabase and sync (2 days)

### Setup

- [ ] Create Supabase project
- [ ] Tables mirroring Dexie (`exercises`, `entries`) plus `user_id` and `updated_at`
- [ ] Row Level Security on all tables: `user_id = auth.uid()` for select / insert / update / delete
- [ ] Enable anonymous sign-ins
- [ ] Enable Turnstile captcha for anonymous sign-ins (free, prevents junk users)

### Sync module

- [ ] `push()`: upsert all local rows with `syncedAt == null`, then mark them
- [ ] `pull()`: fetch rows with `updated_at > lastSyncAt`, upsert into Dexie by ID
- [ ] Triggers: session start, after each log (debounced), `visibilitychange`
- [ ] Conflict resolution: rows are immutable except `deletedAt`, so "latest `deletedAt` wins"
- [ ] Once any session exists (anonymous or linked), sync **all** entries, not just challenge-related ones

### Settings screen

- [ ] "Link an email / Google" using `supabase.auth.updateUser({ email })` or `linkIdentity({ provider: 'google' })` on the **existing** session
  - Never call a fresh `signInWithOAuth` here; that creates a second user and orphans the anonymous one
- [ ] Sign out keeps local data

### Notes

- Free-tier projects pause after a week of inactivity; know where the restore button is in the dashboard.

---

## Phase 5 – Challenges (3 days)

### Tables

| Table                    | Fields                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `challenges`             | `id`, `creator_id`, `exercise_name`, `unit`, `goal_type` (most_reps / first_to), `goal_value`, `starts_at`, `ends_at`, `invite_code` |
| `challenge_members`      | `challenge_id`, `user_id`, `display_name`, `joined_at`                                                                               |
| `challenge_exercise_map` | `challenge_id`, `user_id`, `exercise_id` (maps the user's local exercise to the challenge)                                           |

- [ ] Leaderboard as a Postgres view or RPC: sum of `entries.amount` per member where `loggedAt` is within the challenge window and the exercise is mapped to the challenge
- [ ] RLS: members can read the challenge and the aggregated leaderboard view, never other members' raw entries
- [ ] Rate limit on challenge creation per `user_id`

### Join flow (`/join/CODE`)

1. Ensure a session: `signInAnonymously()` if none exists
2. Ask for a display name
3. Pick or create the local exercise to map onto the challenge
4. Insert `challenge_members` and `challenge_exercise_map` rows
5. Trigger a sync so entries already logged today count
6. Show a one-line hint: "Add an email in settings to keep your challenges if you switch phones"

### Create flow

- [ ] Form: exercise, goal type, goal value, duration (3 days / 1 week / 1 month / custom)
- [ ] Generate a 6-character invite code
- [ ] Share link via the Web Share API

### Leaderboard screen

- [ ] Refetch every 30 s and on focus (good enough for v1); Realtime subscription later if needed
- [ ] Logging on the home screen counts toward challenges automatically; no separate challenge mode

---

## Phase 6 – Polish and hardening (ongoing)

- [x] Dark / light mode (System / Light / Dark in Account)
- [ ] iOS "Add to Home Screen" hint for Safari users
- [ ] Offline indicator
- [x] Export / import JSON in settings (plus Delete all data with confirm)
- [ ] Scheduled Postgres function to purge anonymous users (`is_anonymous = true`) inactive for 90 days
- [ ] Wire up social achievements (first challenge joined, first won, invited 3 people)
- [ ] Tests
  - Vitest: `computeStats`, achievement checks, sync merge logic
  - Playwright: one smoke flow (optional)

---

## Key decisions (for reference)

- **No accounts required.** Stats and achievements are fully local.
- **Joining a challenge creates an anonymous Supabase user** silently; only a display name is asked.
- **Linking an email or Google** upgrades the anonymous user in place, keeping the same `uid`, memberships and data.
- **Exercises are per-user**; a challenge defines its own exercise name and each member maps a local exercise to it.
- **Entries are an append-only log** with soft deletes, which keeps sync trivial.

## Rough total

About two weeks of evenings. Phases 1–3 are the real product and have no external dependencies; if you stall, stall after Phase 3 and you still have an app worth using daily.
