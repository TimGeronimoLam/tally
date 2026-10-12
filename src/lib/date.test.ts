import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  dayKey,
  diffDays,
  parseDayKey,
  shiftDayKey,
  startOfWeekKey,
  weekdayMondayFirst,
} from './date.ts'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('dayKey', () => {
  it('formats local dates with zero padding', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('uses the device timezone, not UTC', () => {
    // 2026-10-12T23:30 in Honolulu is already 2026-10-13 in UTC.
    vi.stubEnv('TZ', 'Pacific/Honolulu')
    const ts = Date.UTC(2026, 9, 13, 9, 30) // 23:30 HST on the 12th
    expect(dayKey(ts)).toBe('2026-10-12')

    vi.stubEnv('TZ', 'Pacific/Kiritimati') // UTC+14
    expect(dayKey(ts)).toBe('2026-10-13')
  })
})

describe('day arithmetic', () => {
  it('round-trips through parseDayKey', () => {
    expect(dayKey(parseDayKey('2026-02-28'))).toBe('2026-02-28')
  })

  it('shifts across month and year boundaries', () => {
    expect(shiftDayKey('2026-02-28', 1)).toBe('2026-03-01')
    expect(shiftDayKey('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('is DST-safe', () => {
    vi.stubEnv('TZ', 'Europe/Berlin') // clocks jump on 2026-03-29
    expect(shiftDayKey('2026-03-28', 1)).toBe('2026-03-29')
    expect(shiftDayKey('2026-03-29', 1)).toBe('2026-03-30')
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
  })

  it('knows Monday-first weekdays', () => {
    expect(weekdayMondayFirst('2026-10-12')).toBe(0) // Monday
    expect(weekdayMondayFirst('2026-10-18')).toBe(6) // Sunday
    expect(startOfWeekKey('2026-10-18')).toBe('2026-10-12')
    expect(startOfWeekKey('2026-10-12')).toBe('2026-10-12')
  })
})
