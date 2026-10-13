/**
 * The Cloudflare Worker behind the deployed app. Requests go straight to the
 * static build (wrangler.jsonc `assets`, SPA fallback included); the cron
 * trigger sends the daily "log your reps" reminders.
 *
 * Secrets (dashboard → Workers → tally → Settings → Variables and Secrets,
 * or `.dev.vars` for `wrangler dev`): see Env below and the README.
 */
import { buildPushPayload, type VapidKeys } from '@block65/webcrypto-web-push'
import { classify, inFilter, notificationPayload } from './reminders.ts'

export interface Env {
  ASSETS: Fetcher
  SUPABASE_URL: string
  /** Supabase secret (service-role) key. Never shipped to the browser. */
  SUPABASE_SERVICE_ROLE_KEY: string
  VAPID_PUBLIC_KEY: string
  VAPID_PRIVATE_KEY: string
  /** `mailto:` address push services can contact about abuse. */
  VAPID_SUBJECT: string
}

/** A row from `public.due_reminders()`. */
interface DueReminder {
  endpoint: string
  p256dh: string
  auth: string
  lang: string
  origin: string
}

export default {
  fetch: (request, env) => env.ASSETS.fetch(request),
  scheduled: (_controller, env, ctx) => {
    ctx.waitUntil(sendDueReminders(env))
  },
} satisfies ExportedHandler<Env>

function supabaseFetch(env: Env, path: string, init: RequestInit) {
  const base = new URL(env.SUPABASE_URL).origin
  return fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  })
}

/**
 * Claim the subscriptions that are due (the database decides who, in each
 * one's own time zone, and marks them sent in the same statement), push to
 * each, and drop those the push service says are gone.
 */
export async function sendDueReminders(env: Env): Promise<void> {
  // Deployed before its settings were added: nothing to do yet. Checked
  // before claiming, so no reminder is marked sent without being sent.
  const missing = (
    [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VAPID_PUBLIC_KEY',
      'VAPID_PRIVATE_KEY',
      'VAPID_SUBJECT',
    ] as const
  ).filter((name) => !env[name])
  if (missing.length > 0) {
    console.warn(`reminders: not configured, missing ${missing.join(', ')}`)
    return
  }
  const res = await supabaseFetch(env, 'rpc/due_reminders', {
    method: 'POST',
    body: '{}',
  })
  if (!res.ok) {
    console.error(`reminders: due_reminders ${res.status} ${await res.text()}`)
    return
  }
  const due = (await res.json()) as DueReminder[]
  if (due.length === 0) return

  const vapid: VapidKeys = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  }
  const results = await Promise.allSettled(
    due.map(async (row) => {
      const payload = await buildPushPayload(
        {
          data: notificationPayload(row.lang, row.origin),
          options: { ttl: 7200, urgency: 'normal', topic: 'daily-reminder' },
        },
        {
          endpoint: row.endpoint,
          expirationTime: null,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        vapid,
      )
      const push = await fetch(row.endpoint, payload)
      const outcome = classify(push.status)
      if (outcome === 'failed') {
        console.warn(
          `reminders: ${new URL(row.endpoint).host} answered ${push.status}`,
        )
      }
      return outcome
    }),
  )

  const gone = due
    .filter((_, i) => {
      const r = results[i]
      return r.status === 'fulfilled' && r.value === 'gone'
    })
    .map((row) => row.endpoint)
  if (gone.length > 0) {
    // One request for all of them: a cron run gets 50 subrequests.
    const del = await supabaseFetch(
      env,
      `push_subscriptions?endpoint=${encodeURIComponent(inFilter(gone))}`,
      { method: 'DELETE' },
    )
    if (!del.ok) console.error(`reminders: delete ${del.status}`)
  }

  const count = (o: string) =>
    results.filter((r) => r.status === 'fulfilled' && r.value === o).length
  const errors = results.filter((r) => r.status === 'rejected')
  for (const e of errors.slice(0, 3)) console.error('reminders:', e.reason)
  console.log(
    `reminders: due ${due.length}, sent ${count('sent')}, gone ${gone.length}, failed ${count('failed') + errors.length}`,
  )
}
