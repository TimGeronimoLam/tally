import { readSocialStats } from '../challenges/social.ts'
import { unlockAchievements } from '../db/achievements.ts'
import { db } from '../db/db.ts'
import { computeStats } from '../stats/computeStats.ts'
import { findNewUnlocks, type Achievement } from './definitions.ts'

/**
 * Check every locked achievement against the current data and persist any
 * that now pass. Returns the newly unlocked ones so the caller can celebrate.
 * Call after each log, after challenge data refreshes, and when a screen
 * that shows badges mounts.
 */
export async function evaluateAchievements(): Promise<Achievement[]> {
  const [entries, exercises, unlocked, social] = await Promise.all([
    db.entries.filter((e) => e.deletedAt == null).toArray(),
    db.exercises.toArray(),
    db.achievements.toArray(),
    readSocialStats(),
  ])
  const fresh = findNewUnlocks(
    { stats: computeStats(entries), entries, exercises, social },
    unlocked.map((u) => u.id),
  )
  await unlockAchievements(fresh.map((a) => a.id))
  return fresh
}
