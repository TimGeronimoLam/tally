import { describe, expect, it } from 'vitest'
import {
  AVATAR_ATTEMPTS,
  AVATAR_MAX_BYTES,
  firstThatFits,
  squareCrop,
} from './avatar.ts'

describe('firstThatFits', () => {
  const blobOf = (bytes: number) => new Blob([new Uint8Array(bytes)])

  it('keeps the first encoding when it fits', async () => {
    const tried: number[] = []
    const blob = await firstThatFits(
      [100, 50, 10],
      async (n) => (tried.push(n), blobOf(n)),
      120,
    )
    expect(blob.size).toBe(100)
    expect(tried).toEqual([100])
  })

  it('moves on until one fits', async () => {
    const blob = await firstThatFits(
      [300, 200, 90, 40],
      async (n) => blobOf(n),
      100,
    )
    expect(blob.size).toBe(90)
  })

  it('returns the last encoding when none fits', async () => {
    const blob = await firstThatFits([300, 200], async (n) => blobOf(n), 100)
    expect(blob.size).toBe(200)
  })

  it('tries the largest, best picture first and ends smaller', () => {
    expect(AVATAR_ATTEMPTS[0]).toEqual({ size: 768, quality: 0.85 })
    expect(AVATAR_ATTEMPTS.at(-1)!.size).toBeLessThan(768)
    expect(AVATAR_MAX_BYTES).toBe(200 * 1024)
  })
})

describe('squareCrop', () => {
  it('cuts the middle of a landscape photo', () => {
    expect(squareCrop(4000, 3000)).toEqual({ sx: 500, sy: 0, size: 3000 })
  })

  it('cuts the middle of a portrait photo', () => {
    expect(squareCrop(1080, 1920)).toEqual({ sx: 0, sy: 420, size: 1080 })
  })

  it('keeps a square as it is', () => {
    expect(squareCrop(256, 256)).toEqual({ sx: 0, sy: 0, size: 256 })
  })

  it('rounds odd margins to whole pixels', () => {
    expect(squareCrop(101, 100)).toEqual({ sx: 1, sy: 0, size: 100 })
  })
})
