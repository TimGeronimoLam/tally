import { describe, expect, it } from 'vitest'
import { chartPeriod, maxChartOffset } from './periods.ts'

const TODAY = '2026-10-21' // a Wednesday

describe('chartPeriod', () => {
  const totals = new Map([
    ['2026-10-21', 5],
    ['2026-10-19', 7],
    ['2026-10-18', 11],
    ['2026-10-12', 13],
    ['2026-10-01', 2],
    ['2026-09-30', 3],
    ['2025-12-31', 17],
    ['2025-01-01', 19],
  ])

  it('covers the calendar week, Monday to Sunday', () => {
    const p = chartPeriod(totals, 'week', 0, TODAY)
    expect(p.start).toBe('2026-10-19')
    expect(p.end).toBe('2026-10-25')
    expect(p.buckets).toHaveLength(7)
    expect(p.buckets[2]).toEqual({ day: TODAY, total: 5 })
    expect(p.buckets[6]).toEqual({ day: '2026-10-25', total: 0 })
    expect(p.total).toBe(12)

    const before = chartPeriod(totals, 'week', 1, TODAY)
    expect(before.start).toBe('2026-10-12')
    expect(before.end).toBe('2026-10-18')
    expect(before.total).toBe(24)
  })

  it('covers the calendar month, from the 1st', () => {
    const p = chartPeriod(totals, 'month', 0, TODAY)
    expect(p.start).toBe('2026-10-01')
    expect(p.end).toBe('2026-10-31')
    expect(p.buckets).toHaveLength(31)
    expect(p.total).toBe(38)

    const before = chartPeriod(totals, 'month', 1, TODAY)
    expect(before.start).toBe('2026-09-01')
    expect(before.end).toBe('2026-09-30')
    expect(before.buckets).toHaveLength(30)
    expect(before.total).toBe(3)

    expect(chartPeriod(totals, 'month', 8, TODAY).buckets).toHaveLength(28)
  })

  it('covers the calendar year, January to December', () => {
    const p = chartPeriod(totals, 'year', 0, TODAY)
    expect(p.start).toBe('2026-01-01')
    expect(p.end).toBe('2026-12-31')
    expect(p.buckets).toHaveLength(12)
    expect(p.buckets[9]).toEqual({ day: '2026-10-01', total: 38 })
    expect(p.buckets[11]).toEqual({ day: '2026-12-01', total: 0 })
    expect(p.total).toBe(41)

    const before = chartPeriod(totals, 'year', 1, TODAY)
    expect(before.start).toBe('2025-01-01')
    expect(before.end).toBe('2025-12-31')
    expect(before.total).toBe(36)
  })
})

describe('maxChartOffset', () => {
  it('is 0 without data or with data only on the current page', () => {
    expect(maxChartOffset(null, 'week', TODAY)).toBe(0)
    expect(maxChartOffset('2026-10-19', 'week', TODAY)).toBe(0)
    expect(maxChartOffset('2026-10-01', 'month', TODAY)).toBe(0)
    expect(maxChartOffset('2026-01-01', 'year', TODAY)).toBe(0)
  })

  it('reaches the page holding the first day', () => {
    expect(maxChartOffset('2026-10-18', 'week', TODAY)).toBe(1)
    expect(maxChartOffset('2026-10-12', 'week', TODAY)).toBe(1)
    expect(maxChartOffset('2026-10-11', 'week', TODAY)).toBe(2)
    expect(maxChartOffset('2026-09-30', 'month', TODAY)).toBe(1)
    expect(maxChartOffset('2025-12-31', 'month', TODAY)).toBe(10)
    expect(maxChartOffset('2025-12-31', 'year', TODAY)).toBe(1)
  })
})
