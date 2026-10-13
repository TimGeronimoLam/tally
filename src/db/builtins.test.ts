import { describe, expect, it } from 'vitest'
import { de } from '../i18n/de.ts'
import { en } from '../i18n/en.ts'
import { MESSAGES } from '../i18n/locale.ts'
import {
  BUILTIN_EXERCISES,
  builtinNamed,
  builtinNamedInAnyLanguage,
  exerciseName,
} from './builtins.ts'

describe('built-in names', () => {
  it('never give one name to two built-ins, in any language', () => {
    const seen = new Map<string, string>()
    for (const m of Object.values(MESSAGES)) {
      for (const b of BUILTIN_EXERCISES) {
        const key = m.defaultExercises[b].trim().toLowerCase()
        expect(seen.get(key) ?? b).toBe(b)
        seen.set(key, b)
      }
    }
  })
})

describe('exerciseName', () => {
  it('names a built-in in the given language, whatever it was stored as', () => {
    const e = { name: 'Pushups', builtin: 'pushups' }
    expect(exerciseName(e, de)).toBe('Liegestütze')
    expect(exerciseName(e, en)).toBe('Pushups')
  })

  it('shows anything else as typed', () => {
    expect(exerciseName({ name: 'Burpees' }, de)).toBe('Burpees')
    expect(exerciseName({ name: 'Burpees', builtin: null }, de)).toBe('Burpees')
    // A key from a newer app version.
    expect(exerciseName({ name: 'Lunges', builtin: 'lunges' }, de)).toBe(
      'Lunges',
    )
  })
})

describe('builtinNamed', () => {
  it('matches the language given, ignoring case and outer spaces', () => {
    expect(builtinNamed(' liegestütze ', de)).toBe('pushups')
    expect(builtinNamed('Plank', de)).toBe('plank')
    expect(builtinNamed('Pushups', de)).toBeUndefined()
    expect(builtinNamed('Burpees', en)).toBeUndefined()
  })

  it('in any language finds defaults seeded elsewhere', () => {
    expect(builtinNamedInAnyLanguage('Liegestütze')).toBe('pushups')
    expect(builtinNamedInAnyLanguage('PUSH-UPS')).toBe('pushups')
    expect(builtinNamedInAnyLanguage('Squat')).toBe('squats')
    expect(builtinNamedInAnyLanguage('Burpees')).toBeUndefined()
  })
})
