import { db } from './db.ts'
import type { UnlockedAchievement } from './types.ts'

export function listUnlockedAchievements(): Promise<UnlockedAchievement[]> {
  return db.achievements.toArray()
}

/** Record unlocks. Re-unlocking an id keeps the original timestamp. */
export async function unlockAchievements(
  ids: string[],
  at = Date.now(),
): Promise<void> {
  if (ids.length === 0) return
  await db.transaction('rw', db.achievements, async () => {
    const existing = new Set(
      (await db.achievements.bulkGet(ids)).flatMap((r) => (r ? [r.id] : [])),
    )
    await db.achievements.bulkAdd(
      ids
        .filter((id) => !existing.has(id))
        .map((id) => ({ id, unlockedAt: at })),
    )
  })
}
