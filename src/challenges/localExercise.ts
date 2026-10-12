import { db } from '../db/db.ts'
import { addExercise, unarchiveExercise } from '../db/exercises.ts'
import { compareSurvivor, nameKey } from '../sync/dedupe.ts'

/**
 * The local exercise that counts toward a challenge is fixed by the
 * challenge itself: whichever of the member's exercises has the same name
 * (case-insensitive). Should two live ones match (sync has not folded them
 * yet), the one sync will keep is used. An archived match is restored; a
 * missing one is created with the challenge's unit. Returns its id.
 */
export async function resolveLocalExercise(
  name: string,
  unit: string,
): Promise<string> {
  const wanted = nameKey({ name })
  const all = await db.exercises.toArray()
  const live = all
    .filter((e) => e.deletedAt == null && nameKey(e) === wanted)
    .sort(compareSurvivor)[0]
  if (live) return live.id
  const archived = all.find((e) => nameKey(e) === wanted)
  if (archived) {
    await unarchiveExercise(archived.id)
    return archived.id
  }
  return (await addExercise(name.trim(), unit)).id
}
