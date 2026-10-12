import { db } from '../db/db.ts'
import { addExercise, unarchiveExercise } from '../db/exercises.ts'

/**
 * The local exercise that counts toward a challenge is fixed by the
 * challenge itself: whichever of the member's exercises has the same name
 * (case-insensitive). An archived match is restored; a missing one is
 * created with the challenge's unit. Returns its id.
 */
export async function resolveLocalExercise(
  name: string,
  unit: string,
): Promise<string> {
  const wanted = name.trim().toLowerCase()
  const all = await db.exercises.toArray()
  const live = all.find(
    (e) => e.deletedAt == null && e.name.trim().toLowerCase() === wanted,
  )
  if (live) return live.id
  const archived = all.find((e) => e.name.trim().toLowerCase() === wanted)
  if (archived) {
    await unarchiveExercise(archived.id)
    return archived.id
  }
  return (await addExercise(name.trim(), unit)).id
}
