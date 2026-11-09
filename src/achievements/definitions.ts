import type { SocialStats } from '../challenges/social.ts'
import type { Entry, Exercise } from '../db/types.ts'
import type { Messages } from '../i18n/index.ts'
import {
  dayKey,
  diffDays,
  parseDayKey,
  weekdayMondayFirst,
} from '../lib/date.ts'
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
  | {
      icon:
        | 'calendar'
        | 'clock'
        | 'layers'
        | 'flag'
        | 'trophy'
        | 'people'
        | 'moon'
        | 'sun'
        | 'refresh'
        | 'medal'
        | 'stats'
        | 'zap'
    }

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

/** Live entries only; every helper below ignores soft-deleted rows. */
function live(entries: Iterable<Entry>): Entry[] {
  const out: Entry[] = []
  for (const e of entries) if (e.deletedAt == null) out.push(e)
  return out
}

/** Number of entries logged before 07:00 local time. */
export function earlyBirdCount(entries: Iterable<Entry>): number {
  let n = 0
  for (const e of live(entries)) if (new Date(e.loggedAt).getHours() < 7) n++
  return n
}

/** Number of entries logged at or after 22:00 local time. */
export function nightOwlCount(entries: Iterable<Entry>): number {
  let n = 0
  for (const e of live(entries)) if (new Date(e.loggedAt).getHours() >= 22) n++
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
  for (const e of live(entries)) ids.add(e.exerciseId)
  return ids.size
}

/** Largest single entry. */
export function biggestSet(entries: Iterable<Entry>): number {
  let best = 0
  for (const e of live(entries)) if (e.amount > best) best = e.amount
  return best
}

/** Most entries logged on one day. */
export function mostSetsInADay(entries: Iterable<Entry>): number {
  const perDay = new Map<string, number>()
  let best = 0
  for (const e of live(entries)) {
    const key = dayKey(e.loggedAt)
    const n = (perDay.get(key) ?? 0) + 1
    perDay.set(key, n)
    if (n > best) best = n
  }
  return best
}

/** Saturdays and Sundays with at least one entry. */
export function weekendDays(dailyTotals: ReadonlyMap<string, number>): number {
  let n = 0
  for (const day of dailyTotals.keys()) if (weekdayMondayFirst(day) >= 5) n++
  return n
}

/** True when the log resumed after a pause of more than `gapDays` empty days. */
export function hasComeback(
  dailyTotals: ReadonlyMap<string, number>,
  gapDays = 30,
): boolean {
  const days = [...dailyTotals.keys()].sort()
  for (let i = 1; i < days.length; i++) {
    if (diffDays(days[i - 1], days[i]) > gapDays) return true
  }
  return false
}

/** Days between the first and the most recent entry. */
export function daysSpanned(dailyTotals: ReadonlyMap<string, number>): number {
  let first: string | null = null
  let last: string | null = null
  for (const day of dailyTotals.keys()) {
    if (first === null || day < first) first = day
    if (last === null || day > last) last = day
  }
  return first !== null && last !== null ? diffDays(first, last) : 0
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

function activeDays(days: number, id: string): Achievement {
  return {
    id,
    section: 'consistency',
    title: (m) => m.achievements.activeDays.title(days),
    description: (m) => m.achievements.activeDays.description(days),
    icon: { text: String(days) },
    check: ({ stats }) => stats.activeDays >= days,
    progress: ({ stats }, m) =>
      m.achievements.activeDays.progress(stats.activeDays, days),
  }
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-log',
    section: 'milestones',
    title: (m) => m.achievements.firstLog.title,
    description: (m) => m.achievements.firstLog.description,
    icon: { text: '1' },
    check: ({ stats }) => stats.allTime >= 1,
  },
  milestone(100, '100', 'reps-100'),
  milestone(1_000, '1k', 'reps-1k'),
  milestone(10_000, '10k', 'reps-10k'),
  milestone(50_000, '50k', 'reps-50k'),
  milestone(100_000, '100k', 'reps-100k'),
  {
    id: 'big-day-500',
    section: 'milestones',
    title: (m) => m.achievements.bigDay.title(formatNumber(500)),
    description: (m) => m.achievements.bigDay.description(formatNumber(500)),
    icon: { icon: 'stats' },
    check: ({ stats }) => (stats.bestDay?.total ?? 0) >= 500,
    progress: ({ stats }, m) =>
      m.achievements.bigDay.progress(formatNumber(stats.bestDay?.total ?? 0)),
  },
  {
    id: 'big-set-100',
    section: 'milestones',
    title: (m) => m.achievements.bigSet.title(formatNumber(100)),
    description: (m) => m.achievements.bigSet.description(formatNumber(100)),
    icon: { icon: 'zap' },
    check: ({ entries }) => biggestSet(entries) >= 100,
    progress: ({ entries }, m) =>
      m.achievements.bigSet.progress(formatNumber(biggestSet(entries))),
  },

  streak(3, 'streak-3'),
  streak(7, 'streak-7'),
  streak(14, 'streak-14'),
  streak(30, 'streak-30'),
  streak(100, 'streak-100'),
  streak(365, 'streak-365'),
  {
    id: 'comeback',
    section: 'streaks',
    title: (m) => m.achievements.comeback.title,
    description: (m) => m.achievements.comeback.description,
    icon: { icon: 'refresh' },
    check: ({ stats }) => hasComeback(stats.dailyTotals),
  },

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
    id: 'night-owl',
    section: 'consistency',
    title: (m) => m.achievements.nightOwl.title,
    description: (m) => m.achievements.nightOwl.description,
    icon: { icon: 'moon' },
    check: ({ entries }) => nightOwlCount(entries) >= 10,
    progress: ({ entries }, m) =>
      m.achievements.nightOwl.progress(nightOwlCount(entries)),
  },
  {
    id: 'weekends',
    section: 'consistency',
    title: (m) => m.achievements.weekends.title,
    description: (m) => m.achievements.weekends.description,
    icon: { icon: 'sun' },
    check: ({ stats }) => weekendDays(stats.dailyTotals) >= 10,
    progress: ({ stats }, m) =>
      m.achievements.weekends.progress(weekendDays(stats.dailyTotals)),
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
    id: 'collector',
    section: 'consistency',
    title: (m) => m.achievements.collector.title,
    description: (m) => m.achievements.collector.description,
    icon: { text: '10' },
    check: ({ entries }) => exercisesTracked(entries) >= 10,
    progress: ({ entries }, m) =>
      m.achievements.collector.progress(exercisesTracked(entries)),
  },
  activeDays(100, 'active-100'),
  activeDays(365, 'active-365'),
  {
    id: 'busy-day',
    section: 'consistency',
    title: (m) => m.achievements.busyDay.title,
    description: (m) => m.achievements.busyDay.description,
    icon: { text: '10x' },
    check: ({ entries }) => mostSetsInADay(entries) >= 10,
    progress: ({ entries }, m) =>
      m.achievements.busyDay.progress(mostSetsInADay(entries)),
  },
  {
    id: 'one-year',
    section: 'consistency',
    title: (m) => m.achievements.oneYear.title,
    description: (m) => m.achievements.oneYear.description,
    icon: { text: '1y' },
    check: ({ stats }) => daysSpanned(stats.dailyTotals) >= 365,
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
    id: 'challenges-5',
    section: 'social',
    title: (m) => m.achievements.challenges.title(5),
    description: (m) => m.achievements.challenges.description(5),
    icon: { text: '5' },
    check: ({ social }) => social.joined >= 5,
    progress: ({ social }, m) =>
      m.achievements.challenges.progress(social.joined, 5),
  },
  {
    id: 'host',
    section: 'social',
    title: (m) => m.achievements.host.title,
    description: (m) => m.achievements.host.description,
    icon: { icon: 'people' },
    check: ({ social }) => social.hosted >= 1,
  },
  {
    id: 'hosted-3',
    section: 'social',
    title: (m) => m.achievements.hosted.title,
    description: (m) => m.achievements.hosted.description,
    icon: { text: '3' },
    check: ({ social }) => social.hosted >= 3,
    progress: ({ social }, m) => m.achievements.hosted.progress(social.hosted),
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
    id: 'wins-3',
    section: 'social',
    title: (m) => m.achievements.wins.title,
    description: (m) => m.achievements.wins.description,
    icon: { icon: 'medal' },
    check: ({ social }) => social.won >= 3,
    progress: ({ social }, m) => m.achievements.wins.progress(social.won),
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
