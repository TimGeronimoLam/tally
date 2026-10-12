import { uuid } from '../lib/uuid.ts'
import { db } from './db.ts'
import type { Exercise } from './types.ts'

export async function addExercise(
  name: string,
  unit: string,
): Promise<Exercise> {
  const exercise: Exercise = {
    id: uuid(),
    name: name.trim(),
    unit: unit.trim() || 'reps',
    createdAt: Date.now(),
  }
  await db.exercises.add(exercise)
  return exercise
}

export async function updateExercise(
  id: string,
  patch: Pick<Exercise, 'name' | 'unit'>,
): Promise<void> {
  await db.exercises.update(id, {
    name: patch.name.trim(),
    unit: patch.unit.trim() || 'reps',
    syncedAt: undefined,
  })
}

/** Soft delete. Entries are kept so stats and sync stay intact. */
export async function archiveExercise(id: string): Promise<void> {
  await db.exercises.update(id, { deletedAt: Date.now(), syncedAt: undefined })
}

export async function unarchiveExercise(id: string): Promise<void> {
  await db.exercises.update(id, { deletedAt: undefined, syncedAt: undefined })
}
