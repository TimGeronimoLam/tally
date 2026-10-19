import { currentLocale } from '../i18n/index.ts'
import {
  dayKey,
  diffDays,
  parseDayKey,
  shiftDayKey,
  startOfWeekKey,
} from '../lib/date.ts'

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export interface HeatmapCell {
  day: string
  total: number
  level: HeatLevel
  /** After today: drawn but not tappable. */
  future: boolean
}

export interface HeatmapColumn {
  /** Monday → Sunday. */
  cells: HeatmapCell[]
  /** Set on the first column of each month. */
  monthLabel?: string
}

export interface HeatmapData {
  columns: HeatmapColumn[]
  /** Quartile cut points used for levels 2–4. */
  thresholds: number[]
}

export interface HeatmapOptions {
  /** Minimum number of weeks shown. */
  weeks?: number
  /** Reach back to the week containing this day when it is further back than `weeks`. */
  since?: string | null
  today?: string
}

/** A month label needs this many columns before the next one to fit. */
const MIN_LABEL_COLUMNS = 3

/**
 * Quartile cut points of the non-zero totals, so intensity is relative to the
 * user's own distribution: one huge day does not flatten the rest.
 */
export function quantileThresholds(totals: Iterable<number>): number[] {
  const sorted = [...totals].filter((t) => t > 0).sort((a, b) => a - b)
  if (sorted.length === 0) return []
  // Nearest-rank quantiles; the largest value always reaches the top level.
  const at = (p: number) => sorted[Math.ceil(p * (sorted.length - 1))]
  return [at(0.25), at(0.5), at(0.75)]
}

export function levelFor(total: number, thresholds: number[]): HeatLevel {
  if (total <= 0) return 0
  let level = 1
  for (const t of thresholds) if (total >= t) level++
  return Math.min(4, level) as HeatLevel
}

/**
 * Lay out Monday-first week columns ending with the week containing `today`:
 * `weeks` of them, or back to `since` if that is further. Month labels
 * carry the year once the grid spans more than the current year.
 */
export function buildHeatmap(
  dailyTotals: ReadonlyMap<string, number>,
  { weeks = 13, since, today = dayKey() }: HeatmapOptions = {},
): HeatmapData {
  const thresholds = quantileThresholds(dailyTotals.values())
  const lastMonday = startOfWeekKey(today)
  if (since && since < today) {
    const back = diffDays(startOfWeekKey(since), lastMonday) / 7
    weeks = Math.max(weeks, back + 1)
  }
  const columns: HeatmapColumn[] = []
  const monthStarts: number[] = []
  let prevMonth = -1

  for (let w = weeks - 1; w >= 0; w--) {
    const monday = shiftDayKey(lastMonday, -7 * w)
    const cells: HeatmapCell[] = []
    for (let d = 0; d < 7; d++) {
      const day = shiftDayKey(monday, d)
      const total = dailyTotals.get(day) ?? 0
      cells.push({
        day,
        total,
        level: levelFor(total, thresholds),
        future: day > today,
      })
    }
    const month = parseDayKey(monday).getMonth()
    if (month !== prevMonth) {
      monthStarts.push(columns.length)
      prevMonth = month
    }
    columns.push({ cells })
  }

  // The first column is often a month's last week: no room for its label.
  if (monthStarts[1] < MIN_LABEL_COLUMNS) monthStarts.shift()
  const firstYear = parseDayKey(columns[0].cells[0].day).getFullYear()
  const showYear = firstYear !== parseDayKey(today).getFullYear()
  monthStarts.forEach((col, i) => {
    const monday = parseDayKey(columns[col].cells[0].day)
    const withYear = showYear && (i === 0 || monday.getMonth() === 0)
    columns[col].monthLabel = monday.toLocaleDateString(currentLocale(), {
      month: 'short',
      year: withYear ? 'numeric' : undefined,
    })
  })

  return { columns, thresholds }
}
