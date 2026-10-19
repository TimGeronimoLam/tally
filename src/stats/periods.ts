import { dayKey, diffDays, parseDayKey, shiftDayKey } from '../lib/date.ts'
import { recentDays, type DayTotal } from './computeStats.ts'

/**
 * How much one page of the bar chart covers: a rolling 7 or 30 days, or
 * twelve calendar months with one bar each.
 */
export type ChartRange = '7d' | '30d' | '1y'

export const CHART_RANGES: readonly ChartRange[] = ['7d', '30d', '1y']

export interface ChartPeriod {
  /** First and last day keys covered, inclusive. */
  start: string
  end: string
  /** One per bar, oldest first. A month's `day` is its 1st. */
  buckets: DayTotal[]
  total: number
}

const DAYS: Record<Exclude<ChartRange, '1y'>, number> = { '7d': 7, '30d': 30 }

/**
 * One page of the bar chart, `offset` pages back from the latest. The latest
 * day page ends today; the latest year page ends with the current month.
 * Pages never overlap: each starts the day (or month) after the one before
 * it ends.
 */
export function chartPeriod(
  dailyTotals: ReadonlyMap<string, number>,
  range: ChartRange,
  offset = 0,
  today = dayKey(),
): ChartPeriod {
  if (range !== '1y') {
    const end = shiftDayKey(today, -offset * DAYS[range])
    const buckets = recentDays(dailyTotals, DAYS[range], end)
    return { start: buckets[0].day, end, buckets, total: sum(buckets) }
  }

  const t = parseDayKey(today)
  const buckets: DayTotal[] = []
  const byMonth = new Map<string, DayTotal>()
  for (let i = 11; i >= 0; i--) {
    const first = dayKey(
      new Date(t.getFullYear(), t.getMonth() - offset * 12 - i, 1),
    )
    const bucket = { day: first, total: 0 }
    buckets.push(bucket)
    byMonth.set(first.slice(0, 7), bucket)
  }
  for (const [day, total] of dailyTotals) {
    const bucket = byMonth.get(day.slice(0, 7))
    if (bucket) bucket.total += total
  }
  const last = parseDayKey(buckets[11].day)
  const end = dayKey(new Date(last.getFullYear(), last.getMonth() + 1, 0))
  return { start: buckets[0].day, end, buckets, total: sum(buckets) }
}

/** The furthest page back that still reaches `firstDay`; 0 with no data. */
export function maxChartOffset(
  firstDay: string | null,
  range: ChartRange,
  today = dayKey(),
): number {
  if (!firstDay || firstDay >= today) return 0
  if (range !== '1y') return Math.floor(diffDays(firstDay, today) / DAYS[range])
  const a = parseDayKey(firstDay)
  const b = parseDayKey(today)
  const months =
    (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()
  return Math.floor(months / 12)
}

function sum(buckets: DayTotal[]): number {
  return buckets.reduce((acc, b) => acc + b.total, 0)
}
