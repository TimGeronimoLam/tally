import { isLocale, MESSAGES } from '../src/i18n/messages.ts'

/**
 * The push message, in the declarative Web Push shape (`web_push: 8030`) so
 * the same JSON can later go to Safari's declarative path unchanged. Today
 * the service worker (src/sw.ts) reads it and shows the notification.
 * A type, not an interface, so it passes as the push library's JSON type.
 */
export type ReminderPayload = {
  web_push: 8030
  notification: {
    title: string
    body: string
    /** Absolute URL a tap opens. */
    navigate: string
    lang: string
    /** Replaces an unread reminder from an earlier day instead of stacking. */
    tag: string
  }
}

export function notificationPayload(
  lang: string,
  origin: string,
): ReminderPayload {
  const locale = isLocale(lang) ? lang : 'en'
  const t = MESSAGES[locale].reminders
  return {
    web_push: 8030,
    notification: {
      title: t.pushTitle,
      body: t.pushBody,
      navigate: `${origin}/`,
      lang: locale,
      tag: 'daily-reminder',
    },
  }
}

export type SendOutcome = 'sent' | 'gone' | 'failed'

/**
 * What a push service's answer means for the subscription. 404 and 410
 * mean it no longer exists (unsubscribed, app removed, expired): delete the
 * row. Anything else non-2xx is worth another try tomorrow.
 */
export function classify(status: number): SendOutcome {
  if (status >= 200 && status < 300) return 'sent'
  if (status === 404 || status === 410) return 'gone'
  return 'failed'
}

/**
 * PostgREST filter value for `endpoint=in.(...)`. Endpoints are URLs, which
 * can hold commas; quoting keeps each one a single item.
 */
export function inFilter(values: readonly string[]): string {
  const quoted = values.map((v) => `"${v.replace(/["\\]/g, '\\$&')}"`)
  return `in.(${quoted.join(',')})`
}
