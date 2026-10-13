import { describe, expect, it } from 'vitest'
import {
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from './codes.ts'
import {
  challengeStatus,
  challengeSubtitle,
  challengeWindow,
  daysLeft,
  daysUntilStart,
  defaultDateRange,
  endOfDayIn,
  gapToFirst,
  isWon,
} from './logic.ts'
import { en } from '../i18n/en.ts'
import { setLocalePreference } from '../i18n/locale.ts'

// Dates and numbers follow the app locale, not the machine running the tests.
setLocalePreference('en')

const NOW = Date.UTC(2026, 9, 12, 12, 0, 0)
const iso = (ms: number) => new Date(ms).toISOString()
const DAY = 86_400_000

describe('invite codes', () => {
  it('generates six characters from the safe alphabet', () => {
    const code = generateInviteCode()
    expect(code).toHaveLength(6)
    expect(isValidInviteCode(code)).toBe(true)
    expect(code).not.toMatch(/[01IO]/)
  })

  it('normalises user input', () => {
    expect(normalizeInviteCode(' tally-7k2q xy ')).toBe('7K2QXY')
    expect(normalizeInviteCode('ab cd-ef')).toBe('ABCDEF')
    expect(isValidInviteCode('ABCDE')).toBe(false)
    expect(isValidInviteCode('ABCDE0')).toBe(false)
  })
})

describe('status and timing', () => {
  const c = { startsAt: iso(NOW - DAY), endsAt: iso(NOW + 2 * DAY) }

  it('classifies upcoming, active and ended', () => {
    expect(challengeStatus(c, NOW)).toBe('active')
    expect(challengeStatus(c, NOW - 2 * DAY)).toBe('upcoming')
    expect(challengeStatus(c, NOW + 2 * DAY)).toBe('ended')
  })

  it('rounds days left up and floors at zero', () => {
    expect(daysLeft(c, NOW)).toBe(2)
    expect(daysLeft(c, NOW + DAY + 1)).toBe(1)
    expect(daysLeft(c, NOW + 3 * DAY)).toBe(0)
  })

  it('counts days until an upcoming start', () => {
    expect(daysUntilStart(c, NOW)).toBe(0)
    expect(daysUntilStart(c, NOW - 2 * DAY)).toBe(1)
    expect(daysUntilStart(c, NOW - 3 * DAY - 1)).toBe(3)
  })

  it('ends challenges at the end of a local day', () => {
    const end = endOfDayIn(7, new Date(2026, 9, 12, 15, 30))
    expect(end.getDate()).toBe(19)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
  })
})

describe('challenge window', () => {
  const now = new Date(2026, 9, 12, 15, 30)

  it('presets start today and end at the end of the last day', () => {
    const w = challengeWindow('1w', defaultDateRange(now), now)!
    expect(w.startsAt).toEqual(new Date(2026, 9, 12))
    expect(w.endsAt).toEqual(new Date(2026, 9, 19, 23, 59, 59, 999))
  })

  it('defaults the custom range to a week from today', () => {
    expect(defaultDateRange(now)).toEqual({
      startKey: '2026-10-12',
      endKey: '2026-10-19',
    })
  })

  it('builds a custom window from local day keys', () => {
    const w = challengeWindow(
      'custom',
      { startKey: '2026-10-01', endKey: '2026-10-31' },
      now,
    )!
    expect(w.startsAt).toEqual(new Date(2026, 9, 1))
    expect(w.endsAt).toEqual(new Date(2026, 9, 31, 23, 59, 59, 999))
  })

  it('allows a single-day custom window', () => {
    const w = challengeWindow(
      'custom',
      { startKey: '2026-10-12', endKey: '2026-10-12' },
      now,
    )!
    expect(w.startsAt).toEqual(new Date(2026, 9, 12))
    expect(w.endsAt.getDate()).toBe(12)
  })

  it('rejects reversed, past or malformed custom ranges', () => {
    const custom = (startKey: string, endKey: string) =>
      challengeWindow('custom', { startKey, endKey }, now)
    expect(custom('2026-10-20', '2026-10-19')).toBeNull()
    expect(custom('2026-10-01', '2026-10-11')).toBeNull()
    expect(custom('', '2026-10-19')).toBeNull()
    expect(custom('2026-10-12', 'soon')).toBeNull()
  })
})

describe('ranking', () => {
  it('formats ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(en.ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '101st',
    ])
  })

  it('computes the gap to first place', () => {
    expect(gapToFirst({ myTotal: 1615, leaderTotal: 1840, myRank: 2 })).toBe(
      226,
    )
    expect(gapToFirst({ myTotal: 1840, leaderTotal: 1840, myRank: 1 })).toBe(0)
  })

  it('decides wins per goal type', () => {
    const active = { startsAt: iso(NOW - DAY), endsAt: iso(NOW + DAY) }
    const ended = { startsAt: iso(NOW - 3 * DAY), endsAt: iso(NOW - DAY) }
    expect(
      isWon(
        {
          ...active,
          goalType: 'first_to',
          goalValue: 1000,
          myTotal: 1000,
          myRank: 1,
        },
        NOW,
      ),
    ).toBe(true)
    expect(
      isWon(
        {
          ...active,
          goalType: 'first_to',
          goalValue: 1000,
          myTotal: 999,
          myRank: 1,
        },
        NOW,
      ),
    ).toBe(false)
    expect(
      isWon(
        {
          ...active,
          goalType: 'most_reps',
          goalValue: null,
          myTotal: 50,
          myRank: 1,
        },
        NOW,
      ),
    ).toBe(false)
    expect(
      isWon(
        {
          ...ended,
          goalType: 'most_reps',
          goalValue: null,
          myTotal: 50,
          myRank: 1,
        },
        NOW,
      ),
    ).toBe(true)
    expect(
      isWon(
        {
          ...ended,
          goalType: 'most_reps',
          goalValue: null,
          myTotal: 50,
          myRank: 2,
        },
        NOW,
      ),
    ).toBe(false)
  })
})

describe('subtitle', () => {
  it('describes active, first-to and ended challenges', () => {
    const base = {
      exerciseName: 'Pushups',
      startsAt: iso(NOW - DAY),
      endsAt: iso(NOW + 19 * DAY),
    }
    expect(
      challengeSubtitle(
        { ...base, goalType: 'most_reps', goalValue: null },
        en,
        { now: NOW },
      ),
    ).toBe('Pushups · Most reps · 19 days left')
    expect(
      challengeSubtitle(
        {
          ...base,
          exerciseName: 'Squats',
          goalType: 'first_to',
          goalValue: 1000,
        },
        en,
        { now: NOW, memberCount: 3 },
      ),
    ).toBe(
      `Squats · First to ${new Intl.NumberFormat('en').format(1000)} · 3 people`,
    )
    expect(
      challengeSubtitle(
        {
          ...base,
          goalType: 'most_reps',
          goalValue: null,
          endsAt: iso(NOW - DAY),
        },
        en,
        { now: NOW },
      ),
    ).toMatch(/^Pushups · Most reps · ended /)
    expect(
      challengeSubtitle(
        {
          ...base,
          goalType: 'most_reps',
          goalValue: null,
          startsAt: iso(NOW + 2 * DAY),
        },
        en,
        { now: NOW },
      ),
    ).toMatch(/^Pushups · Most reps · starts /)
  })
})
