import type { ReminderMeta } from '../db/types.ts'

/** What this device knows when it checks its reminder. */
export interface ReconcileInput {
  /** The reminder as last saved, or null while off. */
  meta: ReminderMeta | null
  /** Supabase user of the current session, or null without one. */
  userId: string | null
  /** This browser's push subscription endpoint, or null. */
  endpoint: string | null
  permission: NotificationPermission
  tz: string
  lang: string
}

export type ReconcileAction =
  /** No session (it was lost): sign in silently; the auth event runs the next pass. */
  | 'sign-in'
  /** New subscription and row for the current user. */
  | 'resubscribe'
  /** Rewrite the row: the time zone or the app language changed. */
  | 'save'
  /** Notification permission is gone: turn the reminder off. */
  | 'disable'
  /** A subscription the app does not track any more. */
  | 'unsubscribe'

/**
 * The one repair a reminder needs, or null when it is in order. Run at
 * launch and on every sign-in, so the reminder survives a lost session, a
 * switch to another account (RLS keeps the old user's row out of reach, so
 * a new subscription is the only way), a dropped subscription, travel and a
 * language change.
 */
export function planReconcile(i: ReconcileInput): ReconcileAction | null {
  if (!i.meta) return i.endpoint ? 'unsubscribe' : null
  if (i.permission !== 'granted') return 'disable'
  if (!i.userId) return 'sign-in'
  if (i.userId !== i.meta.userId || i.endpoint !== i.meta.endpoint)
    return 'resubscribe'
  if (i.tz !== i.meta.tz || i.lang !== i.meta.lang) return 'save'
  return null
}

/** VAPID public key (base64url, as scripts/gen-vapid.mjs prints it) as bytes. */
export function urlBase64ToUint8Array(
  base64url: string,
): Uint8Array<ArrayBuffer> {
  const trimmed = base64url.trim()
  const base64 = trimmed
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(trimmed.length / 4) * 4, '=')
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}
