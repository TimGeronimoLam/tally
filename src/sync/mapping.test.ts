import { describe, expect, it } from 'vitest'
import type { Entry, Exercise } from '../db/types.ts'
import {
  entryToRow,
  exerciseToRow,
  mergeEntry,
  mergeExercise,
  rowToEntry,
  rowToExercise,
  sameContent,
} from './mapping.ts'

const T0 = Date.UTC(2026, 9, 12, 10, 0, 0)

const entry: Entry = {
  id: 'e1',
  exerciseId: 'x1',
  amount: 25,
  loggedAt: T0,
  createdAt: T0,
}

const exercise: Exercise = {
  id: 'x1',
  name: 'Pushups',
  unit: 'reps',
  createdAt: T0,
}

describe('row mapping', () => {
  it('round-trips an entry through the row shape', () => {
    const row = { ...entryToRow(entry), updated_at: new Date(T0).toISOString() }
    expect(row.logged_at).toBe('2026-10-12T10:00:00.000Z')
    expect(row.deleted_at).toBeNull()
    expect(rowToEntry(row, 123)).toEqual({
      ...entry,
      deletedAt: undefined,
      syncedAt: 123,
    })
  })

  it('round-trips an exercise, including deletion', () => {
    const deleted = { ...exercise, deletedAt: T0 + 1000 }
    const row = {
      ...exerciseToRow(deleted),
      updated_at: new Date(T0).toISOString(),
    }
    expect(row.deleted_at).toBe('2026-10-12T10:00:01.000Z')
    expect(rowToExercise(row, 7).deletedAt).toBe(T0 + 1000)
  })

  it('coerces numeric amounts that Postgres returns as strings', () => {
    const row = {
      ...entryToRow(entry),
      amount: '25' as unknown as number,
      updated_at: '',
    }
    expect(rowToEntry(row, 1).amount).toBe(25)
  })
})

describe('mergeEntry', () => {
  const remote: Entry = { ...entry, syncedAt: 500 }

  it('takes the remote row when there is no local copy', () => {
    expect(mergeEntry(undefined, remote)).toBe(remote)
  })

  it('keeps a clean local row in sync with the server', () => {
    const local = { ...entry, syncedAt: 100 }
    expect(mergeEntry(local, remote)).toEqual(remote)
  })

  it('lets a local deletion win and leaves the row dirty for push', () => {
    const local = { ...entry, deletedAt: T0 + 5 }
    const merged = mergeEntry(local, remote)
    expect(merged.deletedAt).toBe(T0 + 5)
    expect(merged.syncedAt).toBeUndefined()
  })

  it('applies a remote deletion to a clean local row', () => {
    const local = { ...entry, syncedAt: 100 }
    const merged = mergeEntry(local, { ...remote, deletedAt: T0 + 9 })
    expect(merged.deletedAt).toBe(T0 + 9)
    expect(merged.syncedAt).toBe(500)
  })

  it('picks the later of two deletions', () => {
    const local = { ...entry, deletedAt: T0 + 1, syncedAt: 100 }
    const merged = mergeEntry(local, { ...remote, deletedAt: T0 + 2 })
    expect(merged.deletedAt).toBe(T0 + 2)
  })

  it('keeps an unpushed move to another exercise', () => {
    const local = { ...entry, exerciseId: 'x2' }
    const merged = mergeEntry(local, remote)
    expect(merged.exerciseId).toBe('x2')
    expect(merged.syncedAt).toBeUndefined()
  })

  it('follows a move made on another device when local is clean', () => {
    const local = { ...entry, syncedAt: 100 }
    const merged = mergeEntry(local, { ...remote, exerciseId: 'x2' })
    expect(merged.exerciseId).toBe('x2')
    expect(merged.syncedAt).toBe(500)
  })
})

describe('mergeExercise', () => {
  const remote: Exercise = { ...exercise, name: 'Push-ups', syncedAt: 500 }

  it('prefers unsynced local edits to name and unit', () => {
    const local = { ...exercise, name: 'Pushups', unit: 'sets' }
    const merged = mergeExercise(local, remote)
    expect(merged.name).toBe('Pushups')
    expect(merged.unit).toBe('sets')
    expect(merged.syncedAt).toBeUndefined()
  })

  it('takes the server copy when local is clean', () => {
    const local = { ...exercise, syncedAt: 100 }
    expect(mergeExercise(local, remote)).toEqual(remote)
  })
})

describe('sameContent', () => {
  it('ignores syncedAt but notices any other field', () => {
    expect(sameContent(entry, { ...entry, syncedAt: 9 })).toBe(true)
    expect(sameContent(entry, { ...entry, deletedAt: 1 })).toBe(false)
  })
})
