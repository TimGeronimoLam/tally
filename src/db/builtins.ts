import { MESSAGES, messages, type Messages } from '../i18n/index.ts'
import { nameKey } from '../sync/dedupe.ts'
import type { Unit } from './units.ts'

/**
 * The exercises Tally ships with. A built-in is known by its key rather
 * than its name: it reads in whatever language the app is in, and a
 * challenge on one counts the same exercise for every member, whichever
 * language each of them uses. Names live in `m.defaultExercises`.
 */
export const BUILTIN_EXERCISES = [
  'pushups',
  'squats',
  'pullups',
  'plank',
] as const

export type BuiltinExercise = (typeof BUILTIN_EXERCISES)[number]

export const BUILTIN_UNITS: Record<BuiltinExercise, Unit> = {
  pushups: 'reps',
  squats: 'reps',
  pullups: 'reps',
  plank: 'sec',
}

export function isBuiltin(v: unknown): v is BuiltinExercise {
  return (
    typeof v === 'string' &&
    (BUILTIN_EXERCISES as readonly string[]).includes(v)
  )
}

/** The name to show: a built-in in the language of `m`, anything else as typed. */
export function exerciseName(
  e: { name: string; builtin?: string | null },
  m: Messages = messages(),
): string {
  return isBuiltin(e.builtin) ? m.defaultExercises[e.builtin] : e.name
}

/** The built-in that goes by `name` in the language of `m`, if any. */
export function builtinNamed(
  name: string,
  m: Messages = messages(),
): BuiltinExercise | undefined {
  const key = nameKey({ name })
  return BUILTIN_EXERCISES.find(
    (b) => nameKey({ name: m.defaultExercises[b] }) === key,
  )
}

/**
 * The built-in that goes by `name` in any language. Finds the defaults
 * seeded before built-ins had a key, in whichever language they were seeded.
 */
export function builtinNamedInAnyLanguage(
  name: string,
): BuiltinExercise | undefined {
  for (const m of Object.values(MESSAGES)) {
    const builtin = builtinNamed(name, m)
    if (builtin) return builtin
  }
  return undefined
}
