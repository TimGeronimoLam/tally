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

/** A row from `public.overtaken_alerts()`: one device of a passed member. */
export interface OvertakenAlert {
  endpoint: string
  p256dh: string
  auth: string
  lang: string
  origin: string
  challenge_id: string
  challenge_name: string
  /** Display name of the member now directly ahead. */
  ahead_name: string | null
  rank: number
  member_count: number
}

/**
 * "Anna just passed you. You're 3rd now." under the challenge's name; a
 * tap opens the challenge. One tag per challenge, so a newer alert
 * replaces an unread older one instead of stacking.
 */
export function overtakenPayload(row: OvertakenAlert): ReminderPayload {
  const locale = isLocale(row.lang) ? row.lang : 'en'
  const t = MESSAGES[locale]
  const place = t.ordinal(row.rank)
  const name = row.ahead_name?.trim()
  return {
    web_push: 8030,
    notification: {
      title: row.challenge_name,
      body: name
        ? t.reminders.passedBody(name, place)
        : t.reminders.passedBodyAnonymous(place),
      navigate: `${row.origin}/challenges/${encodeURIComponent(row.challenge_id)}`,
      lang: locale,
      tag: `overtaken-${row.challenge_id}`,
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
