/**
 * Day key in the device-local timezone, `YYYY-MM-DD`.
 * Used everywhere a "day" matters (today's total, streaks, heatmap).
 */
export function dayKey(d: Date | number = Date.now()): string {
  const date = typeof d === 'number' ? new Date(d) : d
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
