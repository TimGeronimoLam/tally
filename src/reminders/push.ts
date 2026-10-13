import type { SupabaseClient } from '@supabase/supabase-js'
import { deleteMeta, getMeta, setMeta } from '../db/meta.ts'
import { META_KEYS, type ReminderMeta } from '../db/types.ts'
import { messages } from '../i18n/index.ts'
import { captchaToken, isCaptchaError } from '../lib/captcha.ts'
import { recordError } from '../lib/diagnostics.ts'
import { isIOS, isStandalone } from '../lib/install.ts'
import { supabase } from '../lib/supabase.ts'
import { planReconcile, urlBase64ToUint8Array } from './plan.ts'

/**
 * The daily "log your reps" reminder on this device: a Web Push
 * subscription plus a `push_subscriptions` row that the Worker's cron
 * (worker/index.ts) reads. Per device, not per account: the toggle and the
 * time belong to this phone's subscription.
 */

export const DEFAULT_REMINDER_TIME = '19:00'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() || null

export type ReminderAvailability =
  | 'ok'
  | 'unsupported'
  /** iOS in a browser tab: web push needs the Home Screen app. */
  | 'install-first'
  | 'denied'

function pushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Whether this device can turn the reminder on, and if not, why. */
export function reminderAvailability(): ReminderAvailability {
  if (!supabase || !VAPID_PUBLIC_KEY) return 'unsupported'
  if (isIOS() && !isStandalone()) return 'install-first'
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return 'ok'
}

let queue: Promise<unknown> = Promise.resolve()

/** One reminder change at a time: a toggle and a sign-in repair must not interleave. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => undefined)
  return run
}

function requireClient(): SupabaseClient {
  if (!supabase) throw new Error(messages().errors.syncNotConfigured)
  return supabase
}

function currentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

function currentLang(): string {
  return messages().locale
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

/** The active service worker. main.tsx registers it at launch. */
function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const timeout = new Promise<never>((_, reject) =>
    window.setTimeout(
      () => reject(new Error(messages().reminders.unsupported)),
      10_000,
    ),
  )
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

/**
 * The session's user, or a new anonymous one, exactly like joining a
 * challenge: the account card keeps saying "Local only", and an email
 * sign-in later upgrades this same user, so the row stays valid.
 */
function captchaFailed(): Error {
  return new Error(messages().errors.captchaFailed)
}

async function ensureUserId(client: SupabaseClient): Promise<string> {
  const { data } = await client.auth.getSession()
  if (data.session) return data.session.user.id
  const captcha = await captchaToken('reminder')
  const { data: signedIn, error } = await client.auth.signInAnonymously({
    options: { captchaToken: captcha },
  })
  if (error) throw isCaptchaError(error) ? captchaFailed() : error
  if (!signedIn.user) throw new Error(messages().errors.couldNotSignIn)
  return signedIn.user.id
}

async function deleteRow(endpoint: string): Promise<void> {
  if (!supabase) return
  // RLS limits this to the current user's row; anything else stays and
  // dies on its next send, when the push service answers 410.
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
  if (error) console.warn('reminder row not deleted', error.message)
}

async function saveRow(sub: PushSubscription, meta: ReminderMeta) {
  const keys = sub.toJSON().keys
  if (!keys?.p256dh || !keys.auth) {
    throw new Error(messages().reminders.unsupported)
  }
  const { error } = await requireClient().from('push_subscriptions').upsert(
    {
      endpoint: sub.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      tz: meta.tz,
      remind_at: meta.time,
      lang: meta.lang,
      origin: window.location.origin,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
}

/**
 * Replace this browser's subscription with a new one and save its row. A
 * subscription left from another user cannot be reused: RLS hides its row.
 */
async function resubscribe(base: Omit<ReminderMeta, 'endpoint'>) {
  const registration = await readyRegistration()
  const old = await registration.pushManager.getSubscription()
  if (old) {
    await deleteRow(old.endpoint)
    await old.unsubscribe().catch(() => false)
  }
  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY ?? ''),
  })
  const meta: ReminderMeta = { ...base, endpoint: sub.endpoint }
  try {
    await saveRow(sub, meta)
  } catch (err) {
    await sub.unsubscribe().catch(() => false)
    throw err
  }
  await setMeta(META_KEYS.reminder, meta)
}

async function turnOff(meta: ReminderMeta | undefined) {
  await deleteMeta(META_KEYS.reminder)
  const sub = await currentSubscription()
  const endpoint = sub?.endpoint ?? meta?.endpoint
  // Local unsubscribe always wins; a row left behind dies on the next 410.
  await Promise.allSettled([
    endpoint ? deleteRow(endpoint) : null,
    sub?.unsubscribe(),
  ])
}

/**
 * Turn the reminder on. Call straight from the tap: the permission prompt
 * is requested before anything is awaited, because Safari only shows it
 * while the user activation lasts.
 */
export function enableReminder(time: string): Promise<void> {
  if (reminderAvailability() !== 'ok') {
    return Promise.reject(new Error(messages().reminders.unsupported))
  }
  const permission = Notification.requestPermission()
  return serial(async () => {
    if ((await permission) !== 'granted') {
      throw new Error(messages().reminders.notAllowed)
    }
    const userId = await ensureUserId(requireClient())
    await resubscribe({
      userId,
      time,
      tz: currentTimeZone(),
      lang: currentLang(),
    })
  })
}

/** Turn the reminder off on this device. Never fails on the server part. */
export function disableReminder(): Promise<void> {
  return serial(async () => {
    await turnOff(await getMeta<ReminderMeta>(META_KEYS.reminder))
  })
}

/** Move the reminder to another time ("HH:MM"). */
export function setReminderTime(time: string): Promise<void> {
  return serial(async () => {
    const meta = await getMeta<ReminderMeta>(META_KEYS.reminder)
    if (!meta || meta.time === time) return
    const sub = await currentSubscription()
    if (!sub) {
      await resubscribe({ ...meta, time })
      return
    }
    const next: ReminderMeta = { ...meta, time, endpoint: sub.endpoint }
    await setMeta(META_KEYS.reminder, next)
    try {
      await saveRow(sub, next)
    } catch (err) {
      await setMeta(META_KEYS.reminder, meta)
      throw err
    }
  })
}

/**
 * Bring the reminder back in line with the session, the browser and the
 * device (see planReconcile). Run at launch and after each sign-in; never
 * throws, failures land in the diagnostics line on the Account screen.
 */
export function reconcileReminder(): Promise<void> {
  const client = supabase
  if (!client || !pushSupported()) return Promise.resolve()
  return serial(async () => {
    const meta = (await getMeta<ReminderMeta>(META_KEYS.reminder)) ?? null
    const sub = await currentSubscription()
    if (!meta && !sub) return
    const { data } = await client.auth.getSession()
    const userId = data.session?.user.id ?? null
    const tz = currentTimeZone()
    const lang = currentLang()
    const action = planReconcile({
      meta,
      userId,
      endpoint: sub?.endpoint ?? null,
      permission: Notification.permission,
      tz,
      lang,
    })
    if (action === null) return
    if (action === 'sign-in') {
      // Unattended: nobody is looking at this widget, so do not wait on it.
      const captcha = await captchaToken('reminder', { timeoutMs: 30_000 })
      const { error } = await client.auth.signInAnonymously({
        options: { captchaToken: captcha },
      })
      if (error) throw isCaptchaError(error) ? captchaFailed() : error
      return
    }
    if (action === 'disable' || action === 'unsubscribe') {
      await turnOff(meta ?? undefined)
      return
    }
    // 'save' and 'resubscribe' only come with a reminder and a session.
    if (!meta || !userId) return
    if (action === 'save' && sub) {
      const next: ReminderMeta = { ...meta, tz, lang }
      await saveRow(sub, next)
      await setMeta(META_KEYS.reminder, next)
      return
    }
    try {
      await resubscribe({ ...meta, userId, tz, lang })
    } catch (err) {
      // Better off than showing a reminder that will not come.
      await turnOff(meta)
      throw err
    }
  }).catch((err) => recordError('reminder', err))
}
