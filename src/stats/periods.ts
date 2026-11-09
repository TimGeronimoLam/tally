import {
  dayKey,
  diffDays,
  parseDayKey,
  shiftDayKey,
  startOfWeekKey,
} from '../lib/date.ts'
import { recentDays, type DayTotal } from './computeStats.ts'

/**
 * How much one page of the bar chart covers: a calendar week (Monday to
 * Sunday) or month with one bar per day, or a calendar year with one bar per
 * month.
 */
export type ChartRange = 'week' | 'month' | 'year'

export const CHART_RANGES: readonly ChartRange[] = ['week', 'month', 'year']

export interface ChartPeriod {
  /** First and last day keys covered, inclusive. */
  start: string
  end: string
  /** One per bar, oldest first. A month's `day` is its 1st. */
  buckets: DayTotal[]
  total: number
}

/**
 * One page of the bar chart, `offset` pages back from the one holding today.
 * The current page runs to the end of its week, month or year, so days still
 * to come show as empty bars.
 */
export function chartPeriod(
  dailyTotals: ReadonlyMap<string, number>,
  range: ChartRange,
  offset = 0,
  today = dayKey(),
): ChartPeriod {
  const t = parseDayKey(today)

  if (range === 'week') {
    const end = shiftDayKey(startOfWeekKey(today), 6 - offset * 7)
    const buckets = recentDays(dailyTotals, 7, end)
    return { start: buckets[0].day, end, buckets, total: sum(buckets) }
  }

  if (range === 'month') {
    const last = new Date(t.getFullYear(), t.getMonth() - offset + 1, 0)
    const end = dayKey(last)
    const buckets = recentDays(dailyTotals, last.getDate(), end)
    return { start: buckets[0].day, end, buckets, total: sum(buckets) }
  }

  const year = t.getFullYear() - offset
  const buckets: DayTotal[] = []
  const byMonth = new Map<string, DayTotal>()
  for (let m = 0; m < 12; m++) {
    const first = dayKey(new Date(year, m, 1))
    const bucket = { day: first, total: 0 }
    buckets.push(bucket)
    byMonth.set(first.slice(0, 7), bucket)
  }
  for (const [day, total] of dailyTotals) {
    const bucket = byMonth.get(day.slice(0, 7))
    if (bucket) bucket.total += total
  }
  const end = dayKey(new Date(year, 11, 31))
  return { start: buckets[0].day, end, buckets, total: sum(buckets) }
}

/** The furthest page back that still reaches `firstDay`; 0 with no data. */
export function maxChartOffset(
  firstDay: string | null,
  range: ChartRange,
  today = dayKey(),
): number {
  if (!firstDay || firstDay >= today) return 0
  if (range === 'week')
    return diffDays(startOfWeekKey(firstDay), startOfWeekKey(today)) / 7
  const a = parseDayKey(firstDay)
  const b = parseDayKey(today)
  const years = b.getFullYear() - a.getFullYear()
  if (range === 'year') return years
  return years * 12 + b.getMonth() - a.getMonth()
}

function sum(buckets: DayTotal[]): number {
  return buckets.reduce((acc, b) => acc + b.total, 0)
}
