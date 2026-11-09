import { describe, expect, it } from 'vitest'
import changelog from '../../CHANGELOG.md?raw'
import { LOCALES, MESSAGES } from '../i18n/messages.ts'
import { APP_VERSION, RELEASES } from './releases.ts'

describe('releases', () => {
  it('starts with the version package.json gives the build', () => {
    expect(RELEASES[0].version).toBe(APP_VERSION)
  })

  it('runs newest first, with valid dates and semver', () => {
    for (const [i, r] of RELEASES.entries()) {
      expect(r.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(r.date).toISOString().slice(0, 10)).toBe(r.date)
      const next = RELEASES[i + 1]
      if (next) expect(r.date >= next.date).toBe(true)
    }
    expect(new Set(RELEASES.map((r) => r.version)).size).toBe(RELEASES.length)
  })

  it('has at least one note in every language for every release', () => {
    for (const locale of LOCALES) {
      const notes = MESSAGES[locale].changelog.notes
      for (const r of RELEASES) {
        const list: readonly string[] = notes[r.version]
        expect(list.length, `${locale} ${r.version}`).toBeGreaterThan(0)
        for (const note of list) expect(note.trim()).not.toBe('')
      }
    }
  })

  it('matches CHANGELOG.md heading for heading', () => {
    const headings = [...changelog.matchAll(/^## (\S+) – (\S+)$/gm)].map(
      (m) => ({
        version: m[1],
        date: m[2],
      }),
    )
    expect(headings).toEqual(RELEASES.map((r) => ({ ...r })))
  })
})
