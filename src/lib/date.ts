/**
 * Day keys are `YYYY-MM-DD` strings in the device-local timezone. They are
 * the unit of "a day" everywhere: today's total, streaks, the heatmap.
 * Keys sort lexically in date order, which the stats code relies on.
 */

export function dayKey(d: Date | number = Date.now()): string {
  const date = typeof d === 'number' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local midnight for a day key. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Day key `days` after (or before, if negative) `key`. DST-safe. */
export function shiftDayKey(key: string, days: number): string {
  const d = parseDayKey(key)
  d.setDate(d.getDate() + days)
  return dayKey(d)
}

/** Whole days from `a` to `b` (positive when b is later). DST-safe. */
export function diffDays(a: string, b: string): number {
  const ms = parseDayKey(b).getTime() - parseDayKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** 0 = Monday … 6 = Sunday. Weeks start on Monday throughout the app. */
export function weekdayMondayFirst(key: string): number {
  return (parseDayKey(key).getDay() + 6) % 7
}

/** Day key of the Monday starting the week that contains `key`. */
export function startOfWeekKey(key: string): string {
  return shiftDayKey(key, -weekdayMondayFirst(key))
}

/** Local midnight (start of the day) for a timestamp, as epoch ms. */
export function startOfDay(d: Date | number = Date.now()): number {
  const date = typeof d === 'number' ? new Date(d) : new Date(d)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/** Local midnight of the following day, as epoch ms. */
export function endOfDay(d: Date | number = Date.now()): number {
  const date = new Date(startOfDay(d))
  date.setDate(date.getDate() + 1)
  return date.getTime()
}
