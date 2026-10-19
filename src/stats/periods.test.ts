import { describe, expect, it } from 'vitest'
import { chartPeriod, maxChartOffset } from './periods.ts'

const TODAY = '2026-10-19' // a Monday

describe('chartPeriod', () => {
  const totals = new Map([
    ['2026-10-19', 5],
    ['2026-10-13', 7],
    ['2026-10-12', 11],
    ['2026-10-06', 13],
    ['2025-11-30', 17],
    ['2025-10-31', 19],
  ])

  it('ends the latest day page today', () => {
    const p = chartPeriod(totals, '7d', 0, TODAY)
    expect(p.start).toBe('2026-10-13')
    expect(p.end).toBe(TODAY)
    expect(p.buckets).toHaveLength(7)
    expect(p.buckets[6]).toEqual({ day: TODAY, total: 5 })
    expect(p.total).toBe(12)
  })

  it('steps back whole pages without overlap', () => {
    const p = chartPeriod(totals, '7d', 1, TODAY)
    expect(p.start).toBe('2026-10-06')
    expect(p.end).toBe('2026-10-12')
    expect(p.total).toBe(24)

    const month = chartPeriod(totals, '30d', 1, TODAY)
    expect(month.end).toBe('2026-09-19')
    expect(month.start).toBe('2026-08-21')
    expect(month.buckets).toHaveLength(30)
  })

  it('sums calendar months for the year view', () => {
    const p = chartPeriod(totals, '1y', 0, TODAY)
    expect(p.start).toBe('2025-11-01')
    expect(p.end).toBe('2026-10-31')
    expect(p.buckets).toHaveLength(12)
    expect(p.buckets[0]).toEqual({ day: '2025-11-01', total: 17 })
    expect(p.buckets[11]).toEqual({ day: '2026-10-01', total: 36 })
    expect(p.total).toBe(53)

    const before = chartPeriod(totals, '1y', 1, TODAY)
    expect(before.start).toBe('2024-11-01')
    expect(before.end).toBe('2025-10-31')
    expect(before.total).toBe(19)
  })
})

describe('maxChartOffset', () => {
  it('is 0 without data or with data only on the latest page', () => {
    expect(maxChartOffset(null, '7d', TODAY)).toBe(0)
    expect(maxChartOffset('2026-10-13', '7d', TODAY)).toBe(0)
    expect(maxChartOffset('2025-11-01', '1y', TODAY)).toBe(0)
  })

  it('reaches the page holding the first day', () => {
    expect(maxChartOffset('2026-10-12', '7d', TODAY)).toBe(1)
    expect(maxChartOffset('2026-09-19', '30d', TODAY)).toBe(1)
    expect(maxChartOffset('2026-09-20', '30d', TODAY)).toBe(0)
    expect(maxChartOffset('2025-10-31', '1y', TODAY)).toBe(1)
  })
})
