import type { BuiltinExercise } from './builtins.ts'

export interface Exercise {
  id: string
  /** As typed. A built-in shows in the app language instead (`exerciseName`). */
  name: string
  /** Set on the exercises Tally ships with; see builtins.ts. */
  builtin?: BuiltinExercise
  /** Free-form unit label: "reps", "sec", "km" ... */
  unit: string
  createdAt: number
  /** Soft delete / archive. Archived exercises keep their entries. */
  deletedAt?: number
  syncedAt?: number
}

/**
 * Append-only log. Immutable except `deletedAt` (soft delete).
 * Stats are always derived from entries, never stored.
 */
export interface Entry {
  id: string
  exerciseId: string
  amount: number
  /** When the set was performed (epoch ms, device clock). */
  loggedAt: number
  createdAt: number
  deletedAt?: number
  syncedAt?: number
}

/** One row per unlocked achievement. Unlocks are permanent. */
export interface UnlockedAchievement {
  /** Achievement id from src/achievements/definitions.ts */
  id: string
  unlockedAt: number
  syncedAt?: number
}

export interface MetaRow {
  key: string
  value: unknown
}

export const META_KEYS = {
  deviceId: 'deviceId',
  seededAt: 'seededAt',
  lastExerciseId: 'lastExerciseId',
  /** Name shown on leaderboards. Mirrored to Supabase user metadata. */
  displayName: 'displayName',
  /** Cached {joined, hosted, won} counts for social achievements. */
  socialStats: 'socialStats',
  /** Supabase user id the sync markers belong to. */
  syncUserId: 'syncUserId',
  /** Newest `updated_at` pulled per table (ISO string). */
  lastPullExercises: 'lastPull.exercises',
  lastPullEntries: 'lastPull.entries',
} as const
