import { describe, expect, it } from 'vitest'
import { planOwner } from './owner.ts'

const email = { id: 'a', anonymous: false }
const otherEmail = { id: 'c', anonymous: false }
const anon = { id: 'b', anonymous: true }

describe('planOwner', () => {
  it('adopts never-synced rows for any account', () => {
    expect(planOwner(null, email)).toBe('adopt')
    expect(planOwner(null, anon)).toBe('adopt')
  })

  it('keeps going with the same account, flagged or not', () => {
    expect(planOwner({ id: 'a', anonymous: false }, email)).toBe('keep')
    expect(planOwner({ id: 'a', anonymous: undefined }, email)).toBe('keep')
    expect(planOwner({ id: 'b', anonymous: true }, anon)).toBe('keep')
  })

  it('moves an anonymous account into the email account that signed in', () => {
    expect(planOwner({ id: 'b', anonymous: true }, email)).toBe('move')
  })

  it('moves a legacy owner of unknown kind, as before the flag existed', () => {
    expect(planOwner({ id: 'b', anonymous: undefined }, email)).toBe('move')
  })

  it('never lets an anonymous session take over owned rows', () => {
    expect(planOwner({ id: 'a', anonymous: false }, anon)).toBe('refuse')
    expect(planOwner({ id: 'x', anonymous: true }, anon)).toBe('refuse')
    expect(planOwner({ id: 'a', anonymous: undefined }, anon)).toBe('refuse')
  })

  it('never copies one email account into another', () => {
    expect(planOwner({ id: 'a', anonymous: false }, otherEmail)).toBe('refuse')
  })
})
