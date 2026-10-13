import type { SocialStats } from '../challenges/social.ts'
import type { Entry, Exercise } from '../db/types.ts'
import type { Messages } from '../i18n/index.ts'
import { parseDayKey } from '../lib/date.ts'
import { formatNumber } from '../lib/format.ts'
import type { Stats } from '../stats/computeStats.ts'

export type AchievementSection =
  'milestones' | 'streaks' | 'consistency' | 'social'

/** Display order of the sections; titles come from `m.achievements.sections`. */
export const SECTIONS: AchievementSection[] = [
  'milestones',
  'streaks',
  'consistency',
  'social',
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

/** Text is resolved against the active dictionary when shown. */
export interface Achievement {
  id: string
  section: AchievementSection
  title: (m: Messages) => string
  /** How to earn it. Shown under a locked badge when there is no progress note. */
  description: (m: Messages) => string
  icon: AchievementIcon
  check: (ctx: AchievementContext) => boolean
  /** Short progress note while locked, e.g. "41 best so far". */
  progress?: (ctx: AchievementContext, m: Messages) => string
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
    title: (m) => m.achievements.reps.title(formatNumber(total)),
    description: (m) => m.achievements.reps.description(formatNumber(total)),
    icon: { text },
    check: ({ stats }) => stats.allTime >= total,
    progress: ({ stats }, m) =>
      m.achievements.reps.progress(formatNumber(stats.allTime)),
  }
}

function streak(days: number, id: string): Achievement {
  return {
    id,
    section: 'streaks',
    title: (m) => m.achievements.streak.title(days),
    description: (m) => m.achievements.streak.description(days),
    icon: { text: String(days) },
    check: ({ stats }) => stats.longestStreak >= days,
    progress: ({ stats }, m) =>
      m.achievements.streak.progress(stats.longestStreak),
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
    title: (m) => m.achievements.fullMonth.title,
    description: (m) => m.achievements.fullMonth.description,
    icon: { icon: 'calendar' },
    check: ({ stats }) => hasFullMonth(stats.dailyTotals),
  },
  {
    id: 'early-bird',
    section: 'consistency',
    title: (m) => m.achievements.earlyBird.title,
    description: (m) => m.achievements.earlyBird.description,
    icon: { icon: 'clock' },
    check: ({ entries }) => earlyBirdCount(entries) >= 10,
    progress: ({ entries }, m) =>
      m.achievements.earlyBird.progress(earlyBirdCount(entries)),
  },
  {
    id: 'variety',
    section: 'consistency',
    title: (m) => m.achievements.variety.title,
    description: (m) => m.achievements.variety.description,
    icon: { icon: 'layers' },
    check: ({ entries }) => exercisesTracked(entries) >= 5,
    progress: ({ entries }, m) =>
      m.achievements.variety.progress(exercisesTracked(entries)),
  },

  {
    id: 'first-challenge',
    section: 'social',
    title: (m) => m.achievements.firstChallenge.title,
    description: (m) => m.achievements.firstChallenge.description,
    icon: { icon: 'flag' },
    check: ({ social }) => social.joined >= 1,
  },
  {
    id: 'challenge-won',
    section: 'social',
    title: (m) => m.achievements.challengeWon.title,
    description: (m) => m.achievements.challengeWon.description,
    icon: { icon: 'trophy' },
    check: ({ social }) => social.won >= 1,
  },
  {
    id: 'host',
    section: 'social',
    title: (m) => m.achievements.host.title,
    description: (m) => m.achievements.host.description,
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
