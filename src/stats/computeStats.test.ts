import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Entry } from '../db/types.ts'
import { computeStats, recentDays } from './computeStats.ts'

afterEach(() => {
  vi.unstubAllEnvs()
})

let seq = 0
/** Entry at local wall-clock time `y-m-d h:mm`. */
function entry(
  date: string,
  amount: number,
  exerciseId = 'push',
  extra: Partial<Entry> = {},
): Entry {
  const [d, t = '12:00'] = date.split(' ')
  const [y, m, day] = d.split('-').map(Number)
  const [h, min] = t.split(':').map(Number)
  const loggedAt = new Date(y, m - 1, day, h, min).getTime()
  return {
    id: `e${++seq}`,
    exerciseId,
    amount,
    loggedAt,
    createdAt: loggedAt,
    ...extra,
  }
}

const TODAY = '2026-10-12' // a Monday

describe('computeStats', () => {
  it('returns zeros for no entries', () => {
    const s = computeStats([], { today: TODAY })
    expect(s).toMatchObject({
      today: 0,
      thisWeek: 0,
      allTime: 0,
      bestDay: null,
      currentStreak: 0,
      longestStreak: 0,
      activeDays: 0,
      dailyAverage: 0,
    })
  })

  it('sums today, week, all-time and finds the best day', () => {
    const s = computeStats(
      [
        entry('2026-10-12 08:00', 20),
        entry('2026-10-12 18:00', 30),
        entry('2026-10-11', 100), // Sunday: previous week
        entry('2026-10-01', 5),
      ],
      { today: TODAY },
    )
    expect(s.today).toBe(50)
    expect(s.thisWeek).toBe(50)
    expect(s.allTime).toBe(155)
    expect(s.bestDay).toEqual({ day: '2026-10-11', total: 100 })
    expect(s.activeDays).toBe(3)
    expect(s.dailyAverage).toBeCloseTo(155 / 3)
  })

  it('counts the week from Monday', () => {
    const s = computeStats(
      [
        entry('2026-10-13', 10),
        entry('2026-10-12', 10),
        entry('2026-10-11', 10),
      ],
      { today: '2026-10-14' }, // Wednesday
    )
    expect(s.thisWeek).toBe(20)
  })

  it('ignores soft-deleted entries and other exercises when filtered', () => {
    const s = computeStats(
      [
        entry('2026-10-12', 10),
        entry('2026-10-12', 99, 'push', { deletedAt: 1 }),
        entry('2026-10-12', 40, 'squat'),
      ],
      { today: TODAY, exerciseId: 'push' },
    )
    expect(s.today).toBe(10)
    const all = computeStats(
      [entry('2026-10-12', 10), entry('2026-10-12', 40, 'squat')],
      { today: TODAY },
    )
    expect(all.today).toBe(50)
  })

  describe('streaks', () => {
    it('counts consecutive days ending today', () => {
      const s = computeStats(
        [
          entry('2026-10-12', 1),
          entry('2026-10-11', 1),
          entry('2026-10-10', 1),
        ],
        { today: TODAY },
      )
      expect(s.currentStreak).toBe(3)
      expect(s.longestStreak).toBe(3)
    })

    it('keeps the streak alive when today has no entry yet', () => {
      const s = computeStats([entry('2026-10-11', 1), entry('2026-10-10', 1)], {
        today: TODAY,
      })
      expect(s.currentStreak).toBe(2)
    })

    it('breaks after a missed day', () => {
      const s = computeStats(
        [
          entry('2026-10-12', 1),
          entry('2026-10-10', 1),
          entry('2026-10-09', 1),
        ],
        { today: TODAY },
      )
      expect(s.currentStreak).toBe(1)
      expect(s.longestStreak).toBe(2)
    })

    it('is zero when the last entry is older than yesterday', () => {
      const s = computeStats([entry('2026-10-09', 1)], { today: TODAY })
      expect(s.currentStreak).toBe(0)
      expect(s.longestStreak).toBe(1)
    })

    it('treats entries either side of local midnight as different days', () => {
      const s = computeStats(
        [entry('2026-10-11 23:59', 1), entry('2026-10-12 00:01', 1)],
        { today: TODAY },
      )
      expect(s.currentStreak).toBe(2)
      expect(s.dailyTotals.size).toBe(2)
    })

    it('spans a month boundary', () => {
      const s = computeStats([entry('2026-09-30', 1), entry('2026-10-01', 1)], {
        today: '2026-10-01',
      })
      expect(s.currentStreak).toBe(2)
    })

    it('survives a DST change', () => {
      vi.stubEnv('TZ', 'Europe/Berlin')
      const s = computeStats(
        [
          entry('2026-03-28', 1),
          entry('2026-03-29', 1),
          entry('2026-03-30', 1),
        ],
        { today: '2026-03-30' },
      )
      expect(s.currentStreak).toBe(3)
    })
  })

  it('buckets the same instant into different days per timezone', () => {
    const ts = Date.UTC(2026, 9, 13, 9, 30)
    const e: Entry = {
      id: 'x',
      exerciseId: 'push',
      amount: 1,
      loggedAt: ts,
      createdAt: ts,
    }
    vi.stubEnv('TZ', 'Pacific/Honolulu')
    expect([...computeStats([e]).dailyTotals.keys()]).toEqual(['2026-10-12'])
    vi.stubEnv('TZ', 'Pacific/Kiritimati')
    expect([...computeStats([e]).dailyTotals.keys()]).toEqual(['2026-10-13'])
  })
})

describe('recentDays', () => {
  it('returns the last N days oldest first with zeros filled in', () => {
    const totals = new Map([
      ['2026-10-12', 5],
      ['2026-10-10', 7],
    ])
    expect(recentDays(totals, 3, TODAY)).toEqual([
      { day: '2026-10-10', total: 7 },
      { day: '2026-10-11', total: 0 },
      { day: '2026-10-12', total: 5 },
    ])
  })
})
