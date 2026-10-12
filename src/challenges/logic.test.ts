import { describe, expect, it } from 'vitest'
import {
  generateInviteCode,
  isValidInviteCode,
  normalizeInviteCode,
} from './codes.ts'
import {
  challengeStatus,
  challengeSubtitle,
  daysLeft,
  endOfDayIn,
  gapToFirst,
  isWon,
  ordinal,
} from './logic.ts'

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

  it('ends challenges at the end of a local day', () => {
    const end = endOfDayIn(7, new Date(2026, 9, 12, 15, 30))
    expect(end.getDate()).toBe(19)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
  })
})

describe('ranking', () => {
  it('formats ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101].map(ordinal)).toEqual([
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
        { now: NOW, memberCount: 3 },
      ),
    ).toBe(
      `Squats · First to ${new Intl.NumberFormat().format(1000)} · 3 people`,
    )
    expect(
      challengeSubtitle(
        {
          ...base,
          goalType: 'most_reps',
          goalValue: null,
          endsAt: iso(NOW - DAY),
        },
        { now: NOW },
      ),
    ).toMatch(/^Pushups · Most reps · ended /)
  })
})
