import { afterEach, describe, expect, it, vi } from 'vitest'
import { calibrate, resetClock, serverNow } from './clock.ts'

describe('server clock', () => {
  afterEach(() => {
    resetClock()
    vi.useRealTimers()
  })

  it('follows the device clock until calibrated', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    expect(serverNow()).toBe(1_000_000)
  })

  it('shifts by the server offset in either direction', () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 12, 12, 0, 0) })
    calibrate('2026-10-12T12:00:05.123456+00:00')
    expect(serverNow()).toBe(Date.UTC(2026, 9, 12, 12, 0, 5, 123))
    calibrate('2026-10-12T11:59:00+00:00')
    expect(serverNow()).toBe(Date.UTC(2026, 9, 12, 11, 59, 0))
  })

  it('ignores missing or malformed readings', () => {
    vi.useFakeTimers({ now: 5_000 })
    calibrate('2026-10-12T12:00:05+00:00')
    calibrate(undefined)
    calibrate('soon')
    expect(serverNow()).toBe(Date.UTC(2026, 9, 12, 12, 0, 5))
  })
})
