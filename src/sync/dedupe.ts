import type { Exercise } from '../db/types.ts'

/**
 * Within one account an exercise is identified by its built-in key, or
 * else by its name: challenges fix the exercise that counts that way, and
 * the Log screen offers one chip per exercise. Two live copies of one can
 * still meet on a device: every fresh install seeds the same defaults (in
 * its own language), "Delete all data" seeds them again, and an account
 * that comes back to a device finds the copies it pushed earlier. Sync
 * folds such twins into one.
 */

export const nameKey = (e: Pick<Exercise, 'name'>): string =>
  e.name.trim().toLowerCase()

/** Same value for two copies of one exercise, whatever language named them. */
export const identityKey = (e: Pick<Exercise, 'name' | 'builtin'>): string =>
  e.builtin ? `builtin:${e.builtin}` : `name:${nameKey(e)}`

/**
 * Orders copies of one exercise: the one to keep comes first. A row
 * the server already knows is preferred (memberships made on other devices
 * may point at it), then the oldest, then the id so the choice is the same
 * on every device.
 */
export function compareSurvivor(a: Exercise, b: Exercise): number {
  const aSynced = a.syncedAt != null ? 0 : 1
  const bSynced = b.syncedAt != null ? 0 : 1
  if (aSynced !== bSynced) return aSynced - bSynced
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

export interface ExerciseMerge {
  survivor: Exercise
  losers: Exercise[]
}

/** Groups live exercises by identity; one merge per exercise with two copies or more. */
export function planExerciseMerges(exercises: Exercise[]): ExerciseMerge[] {
  const groups = new Map<string, Exercise[]>()
  for (const e of exercises) {
    if (e.deletedAt != null) continue
    const key = identityKey(e)
    const group = groups.get(key)
    if (group) group.push(e)
    else groups.set(key, [e])
  }
  const merges: ExerciseMerge[] = []
  for (const group of groups.values()) {
    if (group.length < 2) continue
    const [survivor, ...losers] = [...group].sort(compareSurvivor)
    merges.push({ survivor, losers })
  }
  return merges
}
