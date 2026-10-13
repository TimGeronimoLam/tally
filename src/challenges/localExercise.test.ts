import { describe, expect, it } from 'vitest'
import type { Exercise } from '../db/types.ts'
import { de } from '../i18n/de.ts'
import { pickLocalExercise, type ChallengeExercise } from './localExercise.ts'

const T0 = Date.UTC(2026, 9, 12, 10, 0, 0)

function ex(id: string, patch: Partial<Exercise> = {}): Exercise {
  return { id, name: 'Liegestütze', unit: 'reps', createdAt: T0, ...patch }
}

/** An English host's pushups challenge. */
const pushups: ChallengeExercise = {
  exerciseName: 'Pushups',
  unit: 'reps',
  exerciseBuiltin: 'pushups',
}

const burpees: ChallengeExercise = {
  exerciseName: 'Burpees',
  unit: 'reps',
  exerciseBuiltin: null,
}

const pick = (exercises: Exercise[], c: ChallengeExercise) =>
  pickLocalExercise(exercises, c, de)?.id

describe('pickLocalExercise', () => {
  it('finds the member’s copy of a built-in in another language', () => {
    const mine = ex('mine', { builtin: 'pushups' })
    const squats = ex('squats', { name: 'Kniebeugen', builtin: 'squats' })
    expect(pick([squats, mine], pushups)).toBe('mine')
  })

  it('prefers the built-in to an exercise that only shares the name', () => {
    const custom = ex('custom', { name: 'Pushups' })
    const builtin = ex('builtin', { builtin: 'pushups' })
    expect(pick([custom, builtin], pushups)).toBe('builtin')
  })

  it('falls back to the name when the member has no copy of the built-in', () => {
    const custom = ex('custom', { name: 'pushups ' })
    expect(pick([custom], pushups)).toBe('custom')
  })

  it('does not take another built-in that happens to share the name', () => {
    const odd = ex('odd', { name: 'Pushups', builtin: 'squats' })
    expect(pick([odd], pushups)).toBeUndefined()
  })

  it('prefers a live match to an archived one', () => {
    const archived = ex('archived', { builtin: 'pushups', deletedAt: T0 })
    const live = ex('live', { name: 'Pushups' })
    expect(pick([archived, live], pushups)).toBe('live')
    expect(pick([archived], pushups)).toBe('archived')
  })

  it('picks the twin sync will keep', () => {
    const local = ex('local', { builtin: 'pushups' })
    const synced = ex('synced', {
      builtin: 'pushups',
      createdAt: T0 + 9,
      syncedAt: 1,
    })
    expect(pick([local, synced], pushups)).toBe('synced')
  })

  it('matches a custom challenge by name, also against built-ins', () => {
    expect(pick([ex('b', { name: 'burpees' })], burpees)).toBe('b')
    const plank = { exerciseName: 'Plank', unit: 'sec', exerciseBuiltin: null }
    const mine = ex('plank', { name: 'Planks', builtin: 'plank' })
    // Stored name differs; "Plank" is what the member sees in German.
    expect(pick([mine], plank)).toBe('plank')
    expect(pick([ex('x')], burpees)).toBeUndefined()
  })
})
