import type { Exercise } from '../db/types.ts'

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n)
}

/**
 * Human label for an amount of an exercise: "pushups", "sec plank".
 * Rep-based exercises read as the exercise name; other units prefix it.
 */
export function unitLabel(exercise: Pick<Exercise, 'name' | 'unit'>): string {
  const name = exercise.name.toLowerCase()
  return exercise.unit === 'reps' ? name : `${exercise.unit} ${name}`
}

/** "Sunday, 12 Oct" */
export function formatHeaderDate(d: Date | number = Date.now()): string {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

/** "Sun, 12 Oct" */
export function formatShortDate(d: Date | number): string {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "Mar 2026" */
export function formatMonthYear(d: Date | number): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  })
}

/** "17:10" / "5:10 PM" depending on locale */
export function formatTime(d: Date | number): string {
  return new Date(d).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}
