import { uuid } from '../lib/uuid.ts'
import { notifyLocalChange } from '../lib/localChanges.ts'
import { builtinNamed, type BuiltinExercise } from './builtins.ts'
import { db } from './db.ts'
import type { Exercise } from './types.ts'

/**
 * An exercise given a built-in's name in the app language is that
 * built-in, so it follows the language from then on.
 */
export async function addExercise(
  name: string,
  unit: string,
  builtin: BuiltinExercise | undefined = builtinNamed(name),
): Promise<Exercise> {
  const exercise: Exercise = {
    id: uuid(),
    name: name.trim(),
    unit: unit.trim() || 'reps',
    createdAt: Date.now(),
    ...(builtin && { builtin }),
  }
  await db.exercises.add(exercise)
  notifyLocalChange()
  return exercise
}

/**
 * The name decides here too: a built-in's name in the app language makes
 * (or keeps) the exercise that built-in; any other name makes it the
 * user's own, shown as typed.
 */
export async function updateExercise(
  id: string,
  patch: Pick<Exercise, 'name' | 'unit'>,
): Promise<void> {
  await db.exercises.update(id, {
    name: patch.name.trim(),
    unit: patch.unit.trim() || 'reps',
    builtin: builtinNamed(patch.name),
    syncedAt: undefined,
  })
  notifyLocalChange()
}

/** Soft delete. Entries are kept so stats and sync stay intact. */
export async function archiveExercise(id: string): Promise<void> {
  await db.exercises.update(id, { deletedAt: Date.now(), syncedAt: undefined })
  notifyLocalChange()
}

export async function unarchiveExercise(id: string): Promise<void> {
  await db.exercises.update(id, { deletedAt: undefined, syncedAt: undefined })
  notifyLocalChange()
}
