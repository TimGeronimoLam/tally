import { exerciseName, type BuiltinExercise } from '../db/builtins.ts'
import { db } from '../db/db.ts'
import { addExercise, unarchiveExercise } from '../db/exercises.ts'
import type { Exercise } from '../db/types.ts'
import { messages, type Messages } from '../i18n/index.ts'
import { compareSurvivor, nameKey } from '../sync/dedupe.ts'

/** The exercise a challenge counts, as the server describes it. */
export interface ChallengeExercise {
  exerciseName: string
  unit: string
  exerciseBuiltin: BuiltinExercise | null
}

/**
 * The member's exercise that counts toward a challenge, among `exercises`.
 * On a built-in it is their copy of that built-in, whichever language
 * either side uses. Otherwise, or when they have no copy, it is whichever
 * of their own exercises goes by the challenge's name (case-insensitive).
 * Live beats archived, a built-in match beats a name match, and between
 * twins sync has not folded yet the one it will keep wins.
 */
export function pickLocalExercise(
  exercises: Exercise[],
  c: ChallengeExercise,
  m: Messages = messages(),
): Exercise | undefined {
  const wanted = nameKey({ name: c.exerciseName })
  /** 0 for a built-in match, 1 for a name match, null for none. */
  const match = (e: Exercise): 0 | 1 | null => {
    if (c.exerciseBuiltin && e.builtin) {
      return e.builtin === c.exerciseBuiltin ? 0 : null
    }
    return nameKey(e) === wanted ||
      nameKey({ name: exerciseName(e, m) }) === wanted
      ? 1
      : null
  }
  return exercises
    .map((e) => ({ e, rank: match(e) }))
    .filter((x): x is { e: Exercise; rank: 0 | 1 } => x.rank !== null)
    .sort(
      (a, b) =>
        Number(a.e.deletedAt != null) - Number(b.e.deletedAt != null) ||
        a.rank - b.rank ||
        compareSurvivor(a.e, b.e),
    )[0]?.e
}

/**
 * Resolves the member's exercise for a challenge (see `pickLocalExercise`)
 * and returns its id. An archived match is restored; with no match one is
 * created with the challenge's unit, a built-in named in the member's
 * language.
 */
export async function resolveLocalExercise(
  c: ChallengeExercise,
): Promise<string> {
  const found = pickLocalExercise(await db.exercises.toArray(), c)
  if (found) {
    if (found.deletedAt != null) await unarchiveExercise(found.id)
    return found.id
  }
  if (c.exerciseBuiltin) {
    const name = messages().defaultExercises[c.exerciseBuiltin]
    return (await addExercise(name, c.unit, c.exerciseBuiltin)).id
  }
  return (await addExercise(c.exerciseName, c.unit)).id
}
