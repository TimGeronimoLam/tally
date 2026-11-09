/**
 * Versions and what changed in each. `RELEASES` is the list; the words are
 * in the dictionaries. A device remembers the version it last saw, so the
 * Log screen can point at What's new once after an update.
 */
export { APP_VERSION, RELEASES, type Version } from './releases.ts'
export { markVersionSeen, readSeenVersion, useWhatsNewPending } from './seen.ts'
