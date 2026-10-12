export interface Exercise {
  id: string
  name: string
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
  lastSyncAt: 'lastSyncAt',
  lastExerciseId: 'lastExerciseId',
} as const
