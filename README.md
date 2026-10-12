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

## PWA notes

- Service worker is only generated on `build`; test install with `npm run preview`.
- Manifest and Workbox config live in `vite.config.ts`.
- Icons are generated placeholders; replace `public/pwa-*.png` and `apple-touch-icon.png` with real artwork.
