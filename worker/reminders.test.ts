import { describe, expect, it } from 'vitest'
import { de } from '../src/i18n/de.ts'
import { en } from '../src/i18n/en.ts'
import {
  classify,
  inFilter,
  notificationPayload,
  overtakenPayload,
  type OvertakenAlert,
} from './reminders.ts'

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

describe('overtakenPayload', () => {
  const row: OvertakenAlert = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    p256dh: 'k',
    auth: 'a',
    lang: 'en',
    origin: 'https://tally.example.com',
    challenge_id: '6f1c2b1e-0000-4000-8000-000000000001',
    challenge_name: 'Push-up November',
    ahead_name: 'Anna',
    rank: 3,
    member_count: 5,
  }

  it('names who is ahead and the new place, under the challenge name', () => {
    expect(overtakenPayload(row)).toEqual({
      web_push: 8030,
      notification: {
        title: 'Push-up November',
        body: "Anna just passed you. You're 3rd now.",
        navigate:
          'https://tally.example.com/challenges/6f1c2b1e-0000-4000-8000-000000000001',
        lang: 'en',
        tag: 'overtaken-6f1c2b1e-0000-4000-8000-000000000001',
      },
    })
  })

  it('words it in the subscription language with its ordinal', () => {
    const p = overtakenPayload({ ...row, lang: 'de', rank: 2 })
    expect(p.notification.body).toBe(de.reminders.passedBody('Anna', '2.'))
  })

  it('copes with a blank name', () => {
    const p = overtakenPayload({ ...row, ahead_name: '  ' })
    expect(p.notification.body).toBe(en.reminders.passedBodyAnonymous('3rd'))
  })
})
