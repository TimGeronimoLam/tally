import { describe, expect, it } from 'vitest'
import type { Exercise } from '../db/types.ts'
import { compareSurvivor, nameKey, planExerciseMerges } from './dedupe.ts'

const T0 = Date.UTC(2026, 9, 12, 10, 0, 0)

function ex(id: string, patch: Partial<Exercise> = {}): Exercise {
  return { id, name: 'Pushups', unit: 'reps', createdAt: T0, ...patch }
}

describe('nameKey', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(nameKey({ name: '  Push-Ups ' })).toBe('push-ups')
  })
})

describe('compareSurvivor', () => {
  it('keeps the copy the server knows over a local-only one', () => {
    const synced = ex('b', { createdAt: T0 + 100, syncedAt: 1 })
    const local = ex('a')
    expect([local, synced].sort(compareSurvivor)[0]).toBe(synced)
  })

  it('then keeps the oldest, then the lowest id', () => {
    const older = ex('z', { createdAt: T0 - 1, syncedAt: 1 })
    const newer = ex('a', { syncedAt: 1 })
    expect([newer, older].sort(compareSurvivor)[0]).toBe(older)
    const twin = ex('b', { createdAt: T0 - 1, syncedAt: 1 })
    expect([twin, older].sort(compareSurvivor)[0]).toBe(twin)
  })
})

describe('planExerciseMerges', () => {
  it('leaves distinct names alone', () => {
    expect(planExerciseMerges([ex('a'), ex('b', { name: 'Squats' })])).toEqual(
      [],
    )
  })

  it('folds every live twin into the survivor', () => {
    const seed = ex('seed')
    const pulled = ex('pulled', { syncedAt: 1 })
    const again = ex('again', { name: 'pushups ', createdAt: T0 + 5 })
    const squats = ex('s', { name: 'Squats' })
    const merges = planExerciseMerges([seed, again, squats, pulled])
    expect(merges).toHaveLength(1)
    expect(merges[0].survivor).toBe(pulled)
    expect(merges[0].losers).toEqual([seed, again])
  })

  it('folds copies of one built-in seeded in different languages', () => {
    const en = ex('en', { builtin: 'pushups', syncedAt: 1 })
    const de = ex('de', { name: 'Liegestütze', builtin: 'pushups' })
    const merges = planExerciseMerges([de, en])
    expect(merges).toEqual([{ survivor: en, losers: [de] }])
  })

  it('keeps a built-in apart from a renamed copy of it', () => {
    const seed = ex('seed', { builtin: 'pushups' })
    const renamed = ex('renamed', { name: 'Push ups' })
    expect(planExerciseMerges([seed, renamed])).toEqual([])
  })

  it('ignores archived exercises', () => {
    const live = ex('live')
    const archived = ex('old', { deletedAt: T0, syncedAt: 1 })
    expect(planExerciseMerges([live, archived])).toEqual([])
  })
})
