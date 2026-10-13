import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { useT } from '../i18n/index.ts'
import { exerciseName } from './builtins.ts'
import { db } from './db.ts'
import { entriesForDay } from './entries.ts'
import { getMeta } from './meta.ts'
import {
  META_KEYS,
  type Entry,
  type Exercise,
  type UnlockedAchievement,
} from './types.ts'

/**
 * Exercises as the UI shows them: `name` is the display name, so built-ins
 * read in the app language and change with it.
 */
function useNamed(rows: Exercise[] | undefined): Exercise[] | undefined {
  const t = useT()
  return useMemo(
    () => rows?.map((e) => ({ ...e, name: exerciseName(e, t) })),
    [rows, t],
  )
}

/** Live (non-archived) exercises in creation order. `undefined` while loading. */
export function useExercises(): Exercise[] | undefined {
  return useNamed(
    useLiveQuery(
      () => db.exercises.filter((e) => e.deletedAt == null).sortBy('createdAt'),
      [],
    ),
  )
}

export function useArchivedExercises(): Exercise[] | undefined {
  const named = useNamed(
    useLiveQuery(
      () => db.exercises.filter((e) => e.deletedAt != null).toArray(),
      [],
    ),
  )
  return useMemo(
    () => named && [...named].sort((a, b) => a.name.localeCompare(b.name)),
    [named],
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

/** Every live entry. Stats derive from this in memory. */
export function useAllEntries(): Entry[] | undefined {
  return useLiveQuery(
    () => db.entries.filter((e) => e.deletedAt == null).toArray(),
    [],
  )
}

/** The user's display name, or '' when unset. `undefined` while loading. */
export function useDisplayName(): string | undefined {
  return useLiveQuery(
    async () => (await getMeta<string>(META_KEYS.displayName)) ?? '',
    [],
  )
}

export function useUnlockedAchievements(): UnlockedAchievement[] | undefined {
  return useLiveQuery(() => db.achievements.toArray(), [])
}

export function useEntryCount(): number {
  return (
    useLiveQuery(
      () => db.entries.filter((e) => e.deletedAt == null).count(),
      [],
    ) ?? 0
  )
}
