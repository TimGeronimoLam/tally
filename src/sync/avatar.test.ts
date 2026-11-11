import { describe, expect, it } from 'vitest'
import { squareCrop } from './avatar.ts'

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
