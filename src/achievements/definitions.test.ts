import { describe, expect, it } from 'vitest'
import type { Entry } from '../db/types.ts'
import { computeStats } from '../stats/computeStats.ts'
import {
  ACHIEVEMENTS,
  biggestSet,
  daysSpanned,
  earlyBirdCount,
  exercisesTracked,
  findNewUnlocks,
  hasComeback,
  hasFullMonth,
  mostSetsInADay,
  nightOwlCount,
  weekendDays,
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
  it('has 31 achievements with unique ids', () => {
    expect(ACHIEVEMENTS).toHaveLength(31)
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(31)
  })

  it('keeps the original ids so existing unlocks still match', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    for (const id of [
      'reps-100',
      'reps-1k',
      'reps-10k',
      'streak-7',
      'streak-30',
      'streak-100',
      'full-month',
      'early-bird',
      'variety',
      'first-challenge',
      'challenge-won',
      'host',
    ])
      expect(ids).toContain(id)
  })

  it('unlocks nothing on an empty history', () => {
    expect(findNewUnlocks(ctx([]), [])).toEqual([])
  })
})

describe('milestones', () => {
  it('count the all-time total across exercises', () => {
    const c = ctx([entry('2026-10-01', 60), entry('2026-10-02', 40, 'squat')])
    expect(byId('first-log').check(c)).toBe(true)
    expect(byId('reps-100').check(c)).toBe(true)
    expect(byId('reps-1k').check(c)).toBe(false)
    expect(byId('reps-100').progress?.(c, en)).toBe('100 so far')
  })

  it('big day uses the best single day, not the total', () => {
    const spread = ctx([entry('2026-10-01', 300), entry('2026-10-02', 300)])
    expect(byId('big-day-500').check(spread)).toBe(false)
    expect(byId('big-day-500').progress?.(spread, en)).toBe(
      '300 best day so far',
    )
    const oneDay = ctx([entry('2026-10-01', 300), entry('2026-10-01', 200)])
    expect(byId('big-day-500').check(oneDay)).toBe(true)
  })

  it('big set needs one entry of 100, ignoring deleted ones', () => {
    const entries = [entry('2026-10-01', 60), entry('2026-10-01', 60)]
    expect(biggestSet(entries)).toBe(60)
    expect(byId('big-set-100').check(ctx(entries))).toBe(false)
    const big = { ...entry('2026-10-02', 120), deletedAt: 1 }
    expect(biggestSet([...entries, big])).toBe(60)
    expect(
      byId('big-set-100').check(ctx([...entries, entry('2026-10-03', 100)])),
    ).toBe(true)
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
    expect(byId('streak-3').check(c)).toBe(true)
  })

  it('comeback needs a gap of more than 30 empty days', () => {
    const totals = (...e: Entry[]) => computeStats(e).dailyTotals
    expect(
      hasComeback(totals(entry('2026-08-01', 1), entry('2026-08-31', 1))),
    ).toBe(false)
    expect(
      hasComeback(totals(entry('2026-08-01', 1), entry('2026-09-01', 1))),
    ).toBe(true)
    expect(hasComeback(totals(entry('2026-08-01', 1)))).toBe(false)
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
    expect(byId('collector').check(ctx(entries))).toBe(false)
    expect(byId('collector').progress?.(ctx(entries), en)).toBe(
      '5 of 10 exercises',
    )
  })

  it('night owl counts entries from 10pm on', () => {
    const entries = [
      ...Array.from({ length: 9 }, (_, i) =>
        entry(`2026-10-0${i + 1}`, 1, 'push', 22),
      ),
      entry('2026-10-10', 1, 'push', 21),
    ]
    expect(nightOwlCount(entries)).toBe(9)
    expect(byId('night-owl').check(ctx(entries))).toBe(false)
    expect(
      byId('night-owl').check(
        ctx([...entries, entry('2026-10-11', 1, 'push', 23)]),
      ),
    ).toBe(true)
  })

  it('weekend days are Saturdays and Sundays with an entry', () => {
    // 2026-10-03 is a Saturday, 2026-10-04 a Sunday, 2026-10-05 a Monday.
    const totals = computeStats([
      entry('2026-10-03', 1),
      entry('2026-10-04', 1),
      entry('2026-10-04', 1),
      entry('2026-10-05', 1),
    ]).dailyTotals
    expect(weekendDays(totals)).toBe(2)
    expect(byId('weekends').progress?.(ctx([entry('2026-10-03', 1)]), en)).toBe(
      '1 of 10 weekend days',
    )
  })

  it('active days count distinct days with entries', () => {
    const c = ctx([
      entry('2026-10-01', 1),
      entry('2026-10-01', 1),
      entry('2026-10-03', 1),
    ])
    expect(c.stats.activeDays).toBe(2)
    expect(byId('active-100').check(c)).toBe(false)
    expect(byId('active-100').progress?.(c, en)).toBe('2 of 100 days')
  })

  it('busy day is the most sets logged on one day', () => {
    const tenSets = Array.from({ length: 10 }, () => entry('2026-10-01', 1))
    expect(mostSetsInADay(tenSets)).toBe(10)
    expect(byId('busy-day').check(ctx(tenSets))).toBe(true)
    expect(byId('busy-day').check(ctx(tenSets.slice(1)))).toBe(false)
    expect(byId('busy-day').progress?.(ctx(tenSets.slice(1)), en)).toBe(
      '9 sets best so far',
    )
  })

  it('one year spans first to latest entry', () => {
    const year = [entry('2025-10-01', 1), entry('2026-10-01', 1)]
    expect(daysSpanned(computeStats(year).dailyTotals)).toBe(365)
    expect(byId('one-year').check(ctx(year))).toBe(true)
    expect(
      byId('one-year').check(
        ctx([entry('2025-10-02', 1), entry('2026-10-01', 1)]),
      ),
    ).toBe(false)
  })
})

describe('findNewUnlocks', () => {
  it('skips achievements that are already unlocked', () => {
    const c = ctx([entry('2026-10-01', 150)])
    const earned = ['first-log', 'reps-100', 'big-set-100']
    expect(findNewUnlocks(c, []).map((a) => a.id)).toEqual(earned)
    expect(findNewUnlocks(c, ['reps-100']).map((a) => a.id)).toEqual([
      'first-log',
      'big-set-100',
    ])
    expect(findNewUnlocks(c, earned)).toEqual([])
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

  it('unlocks the higher social tiers at 5 joined and 3 hosted or won', () => {
    const ids = findNewUnlocks(
      ctx([], '2026-10-12', { joined: 5, hosted: 3, won: 3 }),
      [],
    ).map((a) => a.id)
    expect(ids).toEqual([
      'first-challenge',
      'challenges-5',
      'host',
      'hosted-3',
      'challenge-won',
      'wins-3',
    ])
    const c = ctx([], '2026-10-12', { joined: 2, hosted: 0, won: 1 })
    expect(byId('challenges-5').progress?.(c, en)).toBe('2 of 5 joined')
    expect(byId('wins-3').progress?.(c, en)).toBe('1 of 3 won')
  })
})
