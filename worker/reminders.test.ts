import { describe, expect, it } from 'vitest'
import { de } from '../src/i18n/de.ts'
import { en } from '../src/i18n/en.ts'
import { classify, inFilter, notificationPayload } from './reminders.ts'

describe('notificationPayload', () => {
  it('words the reminder in the subscription language', () => {
    const p = notificationPayload('de', 'https://tally.example.com')
    expect(p).toEqual({
      web_push: 8030,
      notification: {
        title: de.reminders.pushTitle,
        body: de.reminders.pushBody,
        navigate: 'https://tally.example.com/',
        lang: 'de',
        tag: 'daily-reminder',
      },
    })
  })

  it('falls back to English for a language the app does not have', () => {
    const p = notificationPayload('sv', 'https://tally.example.com')
    expect(p.notification.title).toBe(en.reminders.pushTitle)
    expect(p.notification.lang).toBe('en')
  })

  it('fits in one push message', () => {
    // 4096-octet records leave 3993 bytes of plaintext.
    for (const lang of ['en', 'de', 'fr', 'es', 'it', 'nl', 'pt']) {
      const json = JSON.stringify(notificationPayload(lang, 'https://x.dev'))
      expect(new TextEncoder().encode(json).length).toBeLessThan(3993)
    }
  })
})

describe('classify', () => {
  it('treats 2xx as sent', () => {
    expect(classify(201)).toBe('sent')
    expect(classify(200)).toBe('sent')
  })

  it('treats 404 and 410 as a dead subscription', () => {
    expect(classify(404)).toBe('gone')
    expect(classify(410)).toBe('gone')
  })

  it('keeps the subscription on other errors', () => {
    for (const status of [400, 403, 413, 429, 500, 503]) {
      expect(classify(status)).toBe('failed')
    }
  })
})

describe('inFilter', () => {
  it('quotes each endpoint so commas stay inside one value', () => {
    expect(
      inFilter([
        'https://fcm.googleapis.com/fcm/send/a:b,c',
        'https://web.push.apple.com/x',
      ]),
    ).toBe(
      'in.("https://fcm.googleapis.com/fcm/send/a:b,c","https://web.push.apple.com/x")',
    )
  })

  it('escapes quotes and backslashes', () => {
    expect(inFilter(['a"b\\c'])).toBe('in.("a\\"b\\\\c")')
  })
})
