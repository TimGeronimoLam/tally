import type { SocialStats } from '../challenges/social.ts'
import type { Entry, Exercise } from '../db/types.ts'
import { parseDayKey } from '../lib/date.ts'
import { formatNumber } from '../lib/format.ts'
import type { Stats } from '../stats/computeStats.ts'

export type AchievementSection =
  'milestones' | 'streaks' | 'consistency' | 'social'

export const SECTIONS: Array<{ id: AchievementSection; title: string }> = [
  { id: 'milestones', title: 'Milestones' },
  { id: 'streaks', title: 'Streaks' },
  { id: 'consistency', title: 'Consistency' },
  { id: 'social', title: 'Social' },
]

export type AchievementIcon =
  | { text: string }
  | { icon: 'calendar' | 'clock' | 'layers' | 'flag' | 'trophy' | 'people' }

/** Everything a check may look at. Stats are over all exercises. */
export interface AchievementContext {
  stats: Stats
  entries: Entry[]
  exercises: Exercise[]
  /** Challenge counts, cached locally by src/challenges/social.ts. */
  social: SocialStats
}

export interface Achievement {
  id: string
  section: AchievementSection
  title: string
  /** How to earn it. Shown under a locked badge when there is no progress note. */
  description: string
  icon: AchievementIcon
  check: (ctx: AchievementContext) => boolean
  /** Short progress note while locked, e.g. "41 best so far". */
  progress?: (ctx: AchievementContext) => string
}

/* ---------- helpers shared by checks ---------- */

/** Number of entries logged before 07:00 local time. */
export function earlyBirdCount(entries: Iterable<Entry>): number {
  let n = 0
  for (const e of entries) {
    if (e.deletedAt == null && new Date(e.loggedAt).getHours() < 7) n++
  }
  return n
}

/** True when some calendar month has an entry on every one of its days. */
export function hasFullMonth(
  dailyTotals: ReadonlyMap<string, number>,
): boolean {
  const perMonth = new Map<string, number>()
  for (const day of dailyTotals.keys()) {
    const month = day.slice(0, 7)
    perMonth.set(month, (perMonth.get(month) ?? 0) + 1)
  }
  for (const [month, days] of perMonth) {
    const first = parseDayKey(`${month}-01`)
    const daysInMonth = new Date(
      first.getFullYear(),
      first.getMonth() + 1,
      0,
    ).getDate()
    if (days >= daysInMonth) return true
  }
  return false
}

/** Distinct exercises that have at least one entry. */
export function exercisesTracked(entries: Iterable<Entry>): number {
  const ids = new Set<string>()
  for (const e of entries) if (e.deletedAt == null) ids.add(e.exerciseId)
  return ids.size
}

/* ---------- the catalogue ---------- */

function milestone(total: number, text: string, id: string): Achievement {
  return {
    id,
    section: 'milestones',
    title: `${formatNumber(total)} reps`,
    description: `Log ${formatNumber(total)} in total`,
    icon: { text },
    check: ({ stats }) => stats.allTime >= total,
    progress: ({ stats }) => `${formatNumber(stats.allTime)} so far`,
  }
}

function streak(days: number, id: string): Achievement {
  return {
    id,
    section: 'streaks',
    title: `${days}-day streak`,
    description: `Log ${days} days in a row`,
    icon: { text: String(days) },
    check: ({ stats }) => stats.longestStreak >= days,
    progress: ({ stats }) => `${stats.longestStreak} best so far`,
  }
}

export const ACHIEVEMENTS: Achievement[] = [
  milestone(100, '100', 'reps-100'),
  milestone(1_000, '1k', 'reps-1k'),
  milestone(10_000, '10k', 'reps-10k'),

  streak(7, 'streak-7'),
  streak(30, 'streak-30'),
  streak(100, 'streak-100'),

  {
    id: 'full-month',
    section: 'consistency',
    title: 'Full month',
    description: 'Log every day of a month',
    icon: { icon: 'calendar' },
    check: ({ stats }) => hasFullMonth(stats.dailyTotals),
  },
  {
    id: 'early-bird',
    section: 'consistency',
    title: 'Early bird',
    description: '10 logs before 7am',
    icon: { icon: 'clock' },
    check: ({ entries }) => earlyBirdCount(entries) >= 10,
    progress: ({ entries }) => `${earlyBirdCount(entries)} of 10 before 7am`,
  },
  {
    id: 'variety',
    section: 'consistency',
    title: 'Variety',
    description: 'Track 5 exercises',
    icon: { icon: 'layers' },
    check: ({ entries }) => exercisesTracked(entries) >= 5,
    progress: ({ entries }) => `${exercisesTracked(entries)} of 5 exercises`,
  },

  {
    id: 'first-challenge',
    section: 'social',
    title: 'First challenge',
    description: 'Join a challenge',
    icon: { icon: 'flag' },
    check: ({ social }) => social.joined >= 1,
  },
  {
    id: 'challenge-won',
    section: 'social',
    title: 'Won a challenge',
    description: 'Finish first',
    icon: { icon: 'trophy' },
    check: ({ social }) => social.won >= 1,
  },
  {
    id: 'host',
    section: 'social',
    title: 'Host',
    description: 'Start a challenge',
    icon: { icon: 'people' },
    check: ({ social }) => social.hosted >= 1,
  },
]

/** Ids of achievements in `ctx` that are not yet in `unlockedIds`. */
export function findNewUnlocks(
  ctx: AchievementContext,
  unlockedIds: Iterable<string>,
): Achievement[] {
  const have = new Set(unlockedIds)
  return ACHIEVEMENTS.filter((a) => !have.has(a.id) && a.check(ctx))
}
