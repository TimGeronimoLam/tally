import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { EMPTY_SOCIAL, readSocialStats } from '../challenges/social.ts'
import {
  useAllEntries,
  useExercises,
  useUnlockedAchievements,
} from '../db/hooks.ts'
import { formatMonthYear } from '../lib/format.ts'
import { computeStats } from '../stats/computeStats.ts'
import { ACHIEVEMENTS, type Achievement } from './definitions.ts'

export interface AchievementStatus extends Achievement {
  unlockedAt: number | null
  /** Unlock month, progress note, or description. */
  caption: string
}

export interface AchievementsView {
  items: AchievementStatus[]
  unlockedCount: number
  total: number
  /** Id of the most recent unlock, for highlighting. */
  latestId: string | null
  loading: boolean
}

/** Live status of every achievement for the badge grid. */
export function useAchievements(): AchievementsView {
  const entries = useAllEntries()
  const exercises = useExercises()
  const unlocked = useUnlockedAchievements()
  const social = useLiveQuery(readSocialStats, [])

  return useMemo(() => {
    const ctx = {
      stats: computeStats(entries ?? []),
      entries: entries ?? [],
      exercises: exercises ?? [],
      social: social ?? EMPTY_SOCIAL,
    }
    const when = new Map((unlocked ?? []).map((u) => [u.id, u.unlockedAt]))
    const items: AchievementStatus[] = ACHIEVEMENTS.map((a) => {
      const unlockedAt = when.get(a.id) ?? null
      const caption =
        unlockedAt !== null
          ? formatMonthYear(unlockedAt)
          : (a.progress?.(ctx) ?? a.description)
      return { ...a, unlockedAt, caption }
    })
    const latest = items.reduce<AchievementStatus | null>(
      (best, a) =>
        a.unlockedAt !== null &&
        (best === null || a.unlockedAt > best.unlockedAt!)
          ? a
          : best,
      null,
    )
    return {
      items,
      unlockedCount: when.size,
      total: ACHIEVEMENTS.length,
      latestId: latest?.id ?? null,
      loading: entries === undefined || unlocked === undefined,
    }
  }, [entries, exercises, unlocked, social])
}
