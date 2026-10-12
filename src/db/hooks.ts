import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db.ts'
import { entriesForDay } from './entries.ts'
import { getMeta } from './meta.ts'
import { META_KEYS, type Entry, type Exercise } from './types.ts'

/** Live (non-archived) exercises in creation order. `undefined` while loading. */
export function useExercises(): Exercise[] | undefined {
  return useLiveQuery(
    () => db.exercises.filter((e) => e.deletedAt == null).sortBy('createdAt'),
    [],
  )
}

export function useArchivedExercises(): Exercise[] | undefined {
  return useLiveQuery(
    () => db.exercises.filter((e) => e.deletedAt != null).sortBy('name'),
    [],
  )
}

/**
 * The exercise the Log screen is focused on: the persisted choice if it is
 * still live, otherwise the first exercise.
 */
export function useSelectedExercise(
  exercises: Exercise[] | undefined,
): Exercise | null {
  const lastId = useLiveQuery(
    () => getMeta<string>(META_KEYS.lastExerciseId),
    [],
  )
  return exercises?.find((e) => e.id === lastId) ?? exercises?.[0] ?? null
}

/** Today's live entries for one exercise. Empty array when no exercise. */
export function useTodayEntries(exerciseId: string | undefined): Entry[] {
  const entries = useLiveQuery(
    () =>
      exerciseId
        ? entriesForDay(exerciseId).toArray()
        : Promise.resolve<Entry[]>([]),
    [exerciseId],
  )
  return entries ?? []
}

export function useEntryCount(): number {
  return (
    useLiveQuery(
      () => db.entries.filter((e) => e.deletedAt == null).count(),
      [],
    ) ?? 0
  )
}
