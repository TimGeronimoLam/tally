import { describe, expect, it } from 'vitest'
import { buildHeatmap, levelFor, quantileThresholds } from './heatmap.ts'

const TODAY = '2026-10-14' // Wednesday

describe('quantile levels', () => {
  it('ignores zero days and spreads levels across quartiles', () => {
    const t = quantileThresholds([0, 10, 20, 30, 40, 0])
    expect(t).toEqual([20, 30, 40])
    expect(levelFor(0, t)).toBe(0)
    expect(levelFor(10, t)).toBe(1)
    expect(levelFor(25, t)).toBe(2)
    expect(levelFor(35, t)).toBe(3)
    expect(levelFor(50, t)).toBe(4)
  })

  it('does not let one huge day flatten the rest', () => {
    const t = quantileThresholds([10, 12, 11, 13, 1000])
    expect(levelFor(13, t)).toBe(4)
    expect(levelFor(1000, t)).toBe(4)
    expect(levelFor(10, t)).toBe(1)
  })

  it('gives a single non-zero day the top level', () => {
    const t = quantileThresholds([7])
    expect(levelFor(7, t)).toBe(4)
    expect(levelFor(3, t)).toBe(1)
  })
})

describe('buildHeatmap', () => {
  it('ends with the week containing today and marks future days', () => {
    const { columns } = buildHeatmap(new Map(), { weeks: 4, today: TODAY })
    expect(columns).toHaveLength(4)
    const last = columns[3].cells
    expect(last.map((c) => c.day)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ])
    expect(last.map((c) => c.future)).toEqual([
      false,
      false,
      false,
      true,
      true,
      true,
      true,
    ])
    expect(columns[0].cells[0].day).toBe('2026-09-21')
  })

  it('labels the first column of each month', () => {
    const { columns } = buildHeatmap(new Map(), { weeks: 6, today: TODAY })
    const labelled = columns
      .map((c, i) => (c.monthLabel ? i : -1))
      .filter((i) => i >= 0)
    // Columns start on Sep 7, 14, 21, 28, Oct 5, 12 → labels at 0 and 4.
    expect(labelled).toEqual([0, 4])
  })

  it('assigns levels from the totals', () => {
    const totals = new Map([
      ['2026-10-12', 10],
      ['2026-10-13', 100],
    ])
    const { columns } = buildHeatmap(totals, { weeks: 1, today: TODAY })
    expect(columns[0].cells[0].level).toBe(1)
    expect(columns[0].cells[1].level).toBe(4)
    expect(columns[0].cells[2].level).toBe(0)
  })
})
