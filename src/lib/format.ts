import type { Exercise } from '../db/types.ts'
import { currentLocale, messages, type Messages } from '../i18n/index.ts'

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(currentLocale()).format(n)
}

/** Display name for a unit: the built-in ones are translated, others show as stored. */
export function unitName(unit: string, m: Messages = messages()): string {
  return m.units[unit] ?? unit
}

/**
 * Human label for an amount of an exercise: "pushups", "sec plank".
 * Rep-based exercises read as the exercise name; other units prefix it.
 */
export function unitLabel(
  exercise: Pick<Exercise, 'name' | 'unit'>,
  m: Messages = messages(),
): string {
  return m.log.amountLabel(
    exercise.name,
    exercise.unit === 'reps' ? null : unitName(exercise.unit, m),
  )
}

/** "Sunday, 12 Oct" */
export function formatHeaderDate(d: Date | number = Date.now()): string {
  return new Date(d).toLocaleDateString(currentLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

/** "Sun, 12 Oct" */
export function formatShortDate(d: Date | number): string {
  return new Date(d).toLocaleDateString(currentLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "12 Oct" */
export function formatDayMonth(d: Date | number | string): string {
  return new Date(d).toLocaleDateString(currentLocale(), {
    day: 'numeric',
    month: 'short',
  })
}

/** "Mar 2026" */
export function formatMonthYear(d: Date | number): string {
  return new Date(d).toLocaleDateString(currentLocale(), {
    month: 'short',
    year: 'numeric',
  })
}

/** "October" */
export function formatMonthName(d: Date | number = Date.now()): string {
  return new Date(d).toLocaleDateString(currentLocale(), { month: 'long' })
}

/** "17:10" / "5:10 PM" depending on locale */
export function formatTime(d: Date | number): string {
  return new Date(d).toLocaleTimeString(currentLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Weekday names Monday first: "M T W…" (narrow) or "Mon Tue…" (short). */
export function weekdayNames(style: 'narrow' | 'short'): string[] {
  const fmt = new Intl.DateTimeFormat(currentLocale(), { weekday: style })
  // 2024-01-01 is a Monday.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(2024, 0, 1 + i)),
  )
}
