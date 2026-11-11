/** Supabase sync: pull → merge → push, plus auth helpers and status hooks. */
export * from './auth.ts'
export {
  avatarUrl,
  ownAvatarUrl,
  removeAvatar,
  uploadAvatar,
} from './avatar.ts'
export * from './profile.ts'
export * from './status.ts'
export { syncNow, scheduleSync, startSyncTriggers } from './sync.ts'
export type { SyncResult } from './sync.ts'
