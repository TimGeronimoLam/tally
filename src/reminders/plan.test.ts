import { describe, expect, it } from 'vitest'
import type { ReminderMeta } from '../db/types.ts'
import {
  planReconcile,
  urlBase64ToUint8Array,
  type ReconcileInput,
} from './plan.ts'

const meta: ReminderMeta = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  userId: 'user-1',
  time: '19:00',
  tz: 'Europe/Berlin',
  lang: 'de',
}

/** A device whose reminder is in order; each test changes one thing. */
const healthy: ReconcileInput = {
  meta,
  userId: 'user-1',
  endpoint: meta.endpoint,
  permission: 'granted',
  tz: 'Europe/Berlin',
  lang: 'de',
}

describe('planReconcile', () => {
  it('leaves a healthy reminder alone', () => {
    expect(planReconcile(healthy)).toBeNull()
  })

  it('does nothing while off', () => {
    expect(planReconcile({ ...healthy, meta: null, endpoint: null })).toBeNull()
  })

  it('drops a subscription the app no longer tracks', () => {
    expect(planReconcile({ ...healthy, meta: null })).toBe('unsubscribe')
  })

  it('turns off once notification permission is gone', () => {
    expect(planReconcile({ ...healthy, permission: 'denied' })).toBe('disable')
    expect(planReconcile({ ...healthy, permission: 'default' })).toBe('disable')
  })

  it('signs in again when the session is lost', () => {
    expect(planReconcile({ ...healthy, userId: null })).toBe('sign-in')
  })

  it('resubscribes after switching to another account', () => {
    expect(planReconcile({ ...healthy, userId: 'user-2' })).toBe('resubscribe')
  })

  it('resubscribes when the browser dropped or replaced the subscription', () => {
    expect(planReconcile({ ...healthy, endpoint: null })).toBe('resubscribe')
    expect(
      planReconcile({
        ...healthy,
        endpoint: 'https://fcm.googleapis.com/fcm/send/new',
      }),
    ).toBe('resubscribe')
  })

  it('saves the row after travel or a language change', () => {
    expect(planReconcile({ ...healthy, tz: 'America/New_York' })).toBe('save')
    expect(planReconcile({ ...healthy, lang: 'fr' })).toBe('save')
  })

  it('checks permission before the session, the session before the rest', () => {
    expect(
      planReconcile({ ...healthy, permission: 'denied', userId: null }),
    ).toBe('disable')
    expect(planReconcile({ ...healthy, userId: null, tz: 'UTC' })).toBe(
      'sign-in',
    )
  })
})

describe('urlBase64ToUint8Array', () => {
  it('decodes a VAPID public key to the 65-byte uncompressed point', async () => {
    const pair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    )
    const raw = new Uint8Array(
      await crypto.subtle.exportKey('raw', pair.publicKey),
    )
    const base64url = btoa(String.fromCharCode(...raw))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const bytes = urlBase64ToUint8Array(base64url)
    expect(bytes.length).toBe(65)
    expect(bytes[0]).toBe(4)
    expect([...bytes]).toEqual([...raw])
  })

  it('handles the url-safe alphabet and missing padding', () => {
    // 0xfb 0xff → "-_8" in base64url, "+/8=" in base64.
    expect([...urlBase64ToUint8Array('-_8')]).toEqual([0xfb, 0xff])
    expect([...urlBase64ToUint8Array(' AQID \n')]).toEqual([1, 2, 3])
  })
})
