import { isBuiltin } from '../db/builtins.ts'
import type { Entry, Exercise } from '../db/types.ts'

/* Row shapes as Postgres returns them (see supabase/migrations). */

export interface ExerciseRow {
  id: string
  name: string
  unit: string
  builtin: string | null
  created_at: string
  deleted_at: string | null
  updated_at: string
}

export interface EntryRow {
  id: string
  exercise_id: string
  amount: number
  logged_at: string
  created_at: string
  deleted_at: string | null
  updated_at: string
}

const iso = (ms: number) => new Date(ms).toISOString()
const ms = (s: string | null | undefined) =>
  s == null ? undefined : new Date(s).getTime()

/* ---------- local → remote (user_id is filled in by the DB default) ---------- */

export function exerciseToRow(e: Exercise): Omit<ExerciseRow, 'updated_at'> {
  return {
    id: e.id,
    name: e.name,
    unit: e.unit,
    builtin: e.builtin ?? null,
    created_at: iso(e.createdAt),
    deleted_at: e.deletedAt == null ? null : iso(e.deletedAt),
  }
}

export function entryToRow(e: Entry): Omit<EntryRow, 'updated_at'> {
  return {
    id: e.id,
    exercise_id: e.exerciseId,
    amount: e.amount,
    logged_at: iso(e.loggedAt),
    created_at: iso(e.createdAt),
    deleted_at: e.deletedAt == null ? null : iso(e.deletedAt),
  }
}

/* ---------- remote → local ---------- */

export function rowToExercise(r: ExerciseRow, syncedAt: number): Exercise {
  return {
    id: r.id,
    name: r.name,
    unit: r.unit,
    // A key this version does not know reads as the user's own exercise.
    builtin: isBuiltin(r.builtin) ? r.builtin : undefined,
    createdAt: ms(r.created_at)!,
    deletedAt: ms(r.deleted_at),
    syncedAt,
  }
}

export function rowToEntry(r: EntryRow, syncedAt: number): Entry {
  return {
    id: r.id,
    exerciseId: r.exercise_id,
    amount: Number(r.amount),
    loggedAt: ms(r.logged_at)!,
    createdAt: ms(r.created_at)!,
    deletedAt: ms(r.deleted_at),
    syncedAt,
  }
}

/* ---------- merge ---------- */

function latestDeletedAt(a?: number, b?: number): number | undefined {
  if (a == null) return b
  if (b == null) return a
  return Math.max(a, b)
}

/**
 * Entries are immutable except `deletedAt` and, when sync folds two
 * exercises into one, `exerciseId`. "Latest deletedAt wins"; an unpushed
 * local move to another exercise is kept. If the result differs from what
 * the server has, the row is left dirty (no `syncedAt`) so the next push
 * sends it.
 */
export function mergeEntry(local: Entry | undefined, remote: Entry): Entry {
  if (!local) return remote
  const deletedAt = latestDeletedAt(local.deletedAt, remote.deletedAt)
  const localDirty = local.syncedAt == null
  const exerciseId = localDirty ? local.exerciseId : remote.exerciseId
  const dirty =
    localDirty ||
    deletedAt !== remote.deletedAt ||
    exerciseId !== remote.exerciseId
  return {
    ...remote,
    exerciseId,
    deletedAt,
    syncedAt: dirty ? undefined : remote.syncedAt,
  }
}

/**
 * Exercises also carry editable name/unit (and the built-in key, which a
 * rename sets or clears). Unsynced local edits win over the server copy;
 * otherwise the server copy wins.
 */
export function mergeExercise(
  local: Exercise | undefined,
  remote: Exercise,
): Exercise {
  if (!local) return remote
  const deletedAt = latestDeletedAt(local.deletedAt, remote.deletedAt)
  const localDirty = local.syncedAt == null
  const name = localDirty ? local.name : remote.name
  const unit = localDirty ? local.unit : remote.unit
  const builtin = localDirty ? local.builtin : remote.builtin
  const dirty =
    localDirty ||
    deletedAt !== remote.deletedAt ||
    name !== remote.name ||
    unit !== remote.unit ||
    builtin !== remote.builtin
  return {
    ...remote,
    name,
    unit,
    builtin,
    deletedAt,
    syncedAt: dirty ? undefined : remote.syncedAt,
  }
}

/** True when a local row still matches the snapshot that was pushed. */
export function sameContent<T extends { syncedAt?: number }>(
  a: T,
  b: T,
): boolean {
  const strip = ({ syncedAt: _s, ...rest }: T) => rest
  return JSON.stringify(strip(a)) === JSON.stringify(strip(b))
}
