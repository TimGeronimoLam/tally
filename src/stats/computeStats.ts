import type { Entry } from '../db/types.ts'
import { dayKey, diffDays, shiftDayKey, startOfWeekKey } from '../lib/date.ts'

export type ExerciseFilter = string | 'all'

export interface DayTotal {
  day: string
  total: number
}

export interface Stats {
  /** Total logged on `today`. */
  today: number
  /** Monday-to-today total. */
  thisWeek: number
  allTime: number
  bestDay: DayTotal | null
  /** Consecutive days ending today, or ending yesterday if today is still empty. */
  currentStreak: number
  longestStreak: number
  /** Days with at least one entry. */
  activeDays: number
  /** All-time total divided by active days. */
  dailyAverage: number
  /** Day key → total. Only days with entries appear. */
  dailyTotals: Map<string, number>
}

export interface StatsOptions {
  exerciseId?: ExerciseFilter
  /** Day key to treat as today. Defaults to the device's current day. */
  today?: string
}

/**
 * Derive every number the Stats screen shows from raw entries.
 * Pure: no clock access unless `today` is omitted, no database.
 */
export function computeStats(
  entries: Iterable<Entry>,
  { exerciseId = 'all', today = dayKey() }: StatsOptions = {},
): Stats {
  const dailyTotals = new Map<string, number>()
  for (const e of entries) {
    if (e.deletedAt != null) continue
    if (exerciseId !== 'all' && e.exerciseId !== exerciseId) continue
    const key = dayKey(e.loggedAt)
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + e.amount)
  }

  const days = [...dailyTotals.keys()].sort()

  let allTime = 0
  let bestDay: DayTotal | null = null
  let thisWeek = 0
  const weekStart = startOfWeekKey(today)
  for (const day of days) {
    const total = dailyTotals.get(day)!
    allTime += total
    if (!bestDay || total > bestDay.total) bestDay = { day, total }
    if (day >= weekStart && day <= today) thisWeek += total
  }

  let longestStreak = 0
  let run = 0
  let prev: string | null = null
  for (const day of days) {
    run = prev !== null && diffDays(prev, day) === 1 ? run + 1 : 1
    if (run > longestStreak) longestStreak = run
    prev = day
  }

  let currentStreak = 0
  let cursor = dailyTotals.has(today) ? today : shiftDayKey(today, -1)
  while (dailyTotals.has(cursor)) {
    currentStreak++
    cursor = shiftDayKey(cursor, -1)
  }

  return {
    today: dailyTotals.get(today) ?? 0,
    thisWeek,
    allTime,
    bestDay,
    currentStreak,
    longestStreak,
    activeDays: days.length,
    dailyAverage: days.length ? allTime / days.length : 0,
    dailyTotals,
  }
}

/** Totals for the `count` days ending on `today`, oldest first. Empty days are 0. */
export function recentDays(
  dailyTotals: ReadonlyMap<string, number>,
  count: number,
  today = dayKey(),
): DayTotal[] {
  const out: DayTotal[] = []
  for (let i = count - 1; i >= 0; i--) {
    const day = shiftDayKey(today, -i)
    out.push({ day, total: dailyTotals.get(day) ?? 0 })
  }
  return out
}
