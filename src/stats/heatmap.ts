import {
  dayKey,
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
  weeks?: number
  today?: string
}

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

/** Lay out `weeks` columns of Monday-first weeks ending with the week containing `today`. */
export function buildHeatmap(
  dailyTotals: ReadonlyMap<string, number>,
  { weeks = 26, today = dayKey() }: HeatmapOptions = {},
): HeatmapData {
  const thresholds = quantileThresholds(dailyTotals.values())
  const lastMonday = startOfWeekKey(today)
  const columns: HeatmapColumn[] = []
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
    const mondayDate = parseDayKey(monday)
    const month = mondayDate.getMonth()
    const column: HeatmapColumn = { cells }
    if (month !== prevMonth) {
      column.monthLabel = mondayDate.toLocaleDateString(undefined, {
        month: 'short',
      })
      prevMonth = month
    }
    columns.push(column)
  }

  return { columns, thresholds }
}
