# Changelog

What changed in Tally, newest first. Each release here also has user-facing
notes in the app (Account → What's new), in every language, kept in
`src/i18n/*.ts` under `changelog.notes`; `src/changelog/releases.ts` lists
the versions and dates and a test keeps the three in step.

Releases before 1.5.0 are reconstructed from the deploy history: the app
shipped as 1.0.0 and every push to `main` went live without a version bump.

## 1.6.0 – 2026-11-11

- Profile pictures: upload one under Account; it shows on challenge
  leaderboards. Needs migration `20261111000000`.
- Delete account under Account → Data: removes the user and everything that
  cascades from it, plus the photo file. Needs migration `20261111000001`.
- Request a feature under Account → About, mailed through the Worker and
  Resend (see README "Feature requests" for the Worker settings).

## 1.5.0 – 2026-11-09

- Nineteen new achievements, for 31 badges across all four sections.
- A push alert when someone passes you in a challenge (Account →
  Notifications, at most hourly per challenge).
- The stats chart follows the calendar: weeks run Monday to Sunday, months
  from the 1st, years from January.
- Versions and this changelog, shown in the app under Account → What's new,
  with a note on the Log screen after an update.

## 1.4.0 – 2026-11-06

- Public challenges: a host can list a challenge for everyone; the
  Challenges tab shows open ones to join.
- Team goals: a challenge can set one shared total for all members to reach
  together.
- Failed background loads retry quietly instead of showing an error.

## 1.3.0 – 2026-10-26

- Tap a member on a challenge leaderboard to see their stats for it, day by
  day.

## 1.2.0 – 2026-10-19

- Stats reach back through all history, with even bars.
- A challenge's "today" starts at local midnight, like the stats.

## 1.1.1 – 2026-10-15

- Signing in again no longer doubles entries.

## 1.1.0 – 2026-10-13

- Six more languages: German, French, Spanish, Italian, Dutch, Portuguese.
  The app follows the device language; Account → Language overrides it.
- A daily push reminder to log reps (Account → Reminders).
- Native feel: screen transitions, haptics, a system font, pull to refresh on
  the challenge list and detail.
- Members can leave a challenge; hosts can edit one.
- Built-in exercises follow the app language.
- A long press on the keypad still counts; the page no longer rubber-bands.
- A captcha in front of account-creating sign-ins.

## 1.0.0 – 2026-10-12

- Log a set with one tap and one number; works offline.
- Stats: heatmap, streaks and a bar chart.
- Achievements.
- Sign in with an emailed code to sync across phones.
- Challenges with friends: invite codes, leaderboards, custom dates.
- Light and dark mode, home-screen install, export and import.
