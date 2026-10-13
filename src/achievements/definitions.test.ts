import { describe, expect, it } from 'vitest'
import type { Entry } from '../db/types.ts'
import { computeStats } from '../stats/computeStats.ts'
import {
  ACHIEVEMENTS,
  earlyBirdCount,
  exercisesTracked,
  findNewUnlocks,
  hasFullMonth,
  type AchievementContext,
} from './definitions.ts'
import { en } from '../i18n/en.ts'

let seq = 0
function entry(
  date: string,
  amount: number,
  exerciseId = 'push',
  hour = 12,
): Entry {
  const [y, m, d] = date.split('-').map(Number)
  const loggedAt = new Date(y, m - 1, d, hour).getTime()
  return { id: `e${++seq}`, exerciseId, amount, loggedAt, createdAt: loggedAt }
}

function ctx(
  entries: Entry[],
  today = '2026-10-12',
  social = { joined: 0, hosted: 0, won: 0 },
): AchievementContext {
  return {
    stats: computeStats(entries, { today }),
    entries,
    exercises: [],
    social,
  }
}

const byId = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!

describe('catalogue', () => {
  it('has twelve achievements with unique ids', () => {
    expect(ACHIEVEMENTS).toHaveLength(12)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(12)
  })

  it('unlocks nothing on an empty history', () => {
    expect(findNewUnlocks(ctx([]), [])).toEqual([])
  })
})

describe('milestones', () => {
  it('count the all-time total across exercises', () => {
    const c = ctx([entry('2026-10-01', 60), entry('2026-10-02', 40, 'squat')])
    expect(byId('reps-100').check(c)).toBe(true)
    expect(byId('reps-1k').check(c)).toBe(false)
    expect(byId('reps-100').progress?.(c, en)).toBe('100 so far')
  })
})

describe('streaks', () => {
  it('use the longest streak, not the current one', () => {
    const days = Array.from({ length: 7 }, (_, i) =>
      entry(`2026-09-0${i + 1}`, 1),
    )
    const c = ctx(days)
    expect(c.stats.currentStreak).toBe(0)
    expect(byId('streak-7').check(c)).toBe(true)
    expect(byId('streak-30').check(c)).toBe(false)
    expect(byId('streak-30').progress?.(c, en)).toBe('7 best so far')
  })
})

describe('consistency', () => {
  it('full month needs every day of a calendar month', () => {
    const sept = Array.from({ length: 30 }, (_, i) =>
      entry(`2026-09-${String(i + 1).padStart(2, '0')}`, 1),
    )
    expect(hasFullMonth(computeStats(sept).dailyTotals)).toBe(true)
    expect(hasFullMonth(computeStats(sept.slice(1)).dailyTotals)).toBe(false)
  })

  it('early bird counts entries before 7am', () => {
    const entries = [
      ...Array.from({ length: 9 }, (_, i) =>
        entry(`2026-10-0${i + 1}`, 1, 'push', 6),
      ),
      entry('2026-10-10', 1, 'push', 7),
    ]
    expect(earlyBirdCount(entries)).toBe(9)
    expect(byId('early-bird').check(ctx(entries))).toBe(false)
    expect(byId('early-bird').progress?.(ctx(entries), en)).toBe(
      '9 of 10 before 7am',
    )
    expect(
      byId('early-bird').check(
        ctx([...entries, entry('2026-10-11', 1, 'push', 5)]),
      ),
    ).toBe(true)
  })

  it('variety counts distinct exercises with entries', () => {
    const entries = ['a', 'b', 'c', 'd', 'e'].map((ex) =>
      entry('2026-10-01', 1, ex),
    )
    expect(exercisesTracked(entries)).toBe(5)
    expect(byId('variety').check(ctx(entries))).toBe(true)
    expect(byId('variety').check(ctx(entries.slice(1)))).toBe(false)
  })
})

describe('findNewUnlocks', () => {
  it('skips achievements that are already unlocked', () => {
    const c = ctx([entry('2026-10-01', 150)])
    expect(findNewUnlocks(c, []).map((a) => a.id)).toEqual(['reps-100'])
    expect(findNewUnlocks(c, ['reps-100'])).toEqual([])
  })

  it('keeps social achievements locked without challenge activity', () => {
    const c = ctx([entry('2026-10-01', 99_999)])
    const ids = findNewUnlocks(c, []).map((a) => a.id)
    expect(ids).not.toContain('first-challenge')
    expect(ids).toContain('reps-10k')
  })

  it('unlocks social achievements from cached challenge counts', () => {
    const ids = findNewUnlocks(
      ctx([], '2026-10-12', { joined: 2, hosted: 1, won: 0 }),
      [],
    ).map((a) => a.id)
    expect(ids).toEqual(['first-challenge', 'host'])
  })
})
