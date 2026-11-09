import type { Messages } from '../i18n/en.ts'

/** A version the dictionaries have notes for. */
type Noted = keyof Messages['changelog']['notes']

/**
 * Every version the app has shipped as, newest first. The notes a user
 * reads for each live in the dictionaries (src/i18n/*.ts, `changelog.notes`)
 * and the developer log in CHANGELOG.md; releases.test.ts keeps the three
 * and package.json in step.
 */
export const RELEASES = [
  { version: '1.5.0', date: '2026-11-09' },
  { version: '1.4.0', date: '2026-11-06' },
  { version: '1.3.0', date: '2026-10-26' },
  { version: '1.2.0', date: '2026-10-19' },
  { version: '1.1.1', date: '2026-10-15' },
  { version: '1.1.0', date: '2026-10-13' },
  { version: '1.0.0', date: '2026-10-12' },
] as const satisfies ReadonlyArray<{ version: Noted; date: string }>

export type Version = (typeof RELEASES)[number]['version']

/** The version this build is, from package.json (vite.config.ts). */
export const APP_VERSION: Version = __APP_VERSION__ as Version
