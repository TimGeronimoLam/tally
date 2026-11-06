import { describe, expect, it } from 'vitest'
import { retryDelay } from './retry.ts'

describe('retryDelay', () => {
  it('doubles from 2 s', () => {
    expect([1, 2, 3, 4].map((n) => retryDelay(n, 60_000))).toEqual([
      2000, 4000, 8000, 16000,
    ])
  })

  it('never waits longer than the cap', () => {
    expect(retryDelay(5, 30_000)).toBe(30_000)
    expect(retryDelay(50, 30_000)).toBe(30_000)
  })
})
