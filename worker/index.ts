/**
 * The Cloudflare Worker behind the deployed app. Requests go straight to the
 * static build (wrangler.jsonc `assets`, SPA fallback included); the cron
 * trigger sends the daily "log your reps" reminders and the "someone
 * passed you" challenge alerts. /api/feature-request mails the Account
 * page's feature request form (worker/feature-request.ts).
 *
 * Secrets (dashboard → Workers → tally → Settings → Variables and Secrets,
 * or `.dev.vars` for `wrangler dev`): see Env below and the README.
 */
import { buildPushPayload, type VapidKeys } from '@block65/webcrypto-web-push'
import {
  handleFeatureRequest,
  type FeatureRequestEnv,
} from './feature-request.ts'
import {
  classify,
  inFilter,
  notificationPayload,
  overtakenPayload,
  type OvertakenAlert,
  type ReminderPayload,
} from './reminders.ts'

export interface Env extends FeatureRequestEnv {
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
  fetch: (request, env) =>
    new URL(request.url).pathname === '/api/feature-request'
      ? handleFeatureRequest(request, env)
      : env.ASSETS.fetch(request),
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

/** A push to send: the device and what to show on it. */
interface Push {
  endpoint: string
  p256dh: string
  auth: string
  data: ReminderPayload
  options: { ttl: number; topic: string }
}

/**
 * A cron run may make 50 subrequests on the free plan: two RPCs and one
 * delete leave 47 for pushes. Challenge alerts go first (they are about
 * the last 15 minutes); the daily reminders take what is left, and the
 * rest go out on the next run, inside their grace window.
 */
const PUSH_BUDGET = 47
const ALERT_MEMBERS_PER_RUN = 15

async function rpc<T>(env: Env, name: string, args: object): Promise<T[]> {
  const res = await supabaseFetch(env, `rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(args),
  })
  if (!res.ok) {
    console.error(`push: ${name} ${res.status} ${await res.text()}`)
    return []
  }
  return (await res.json()) as T[]
}

/**
 * Claim who is due (the database decides: passed in a challenge since the
 * last run, or past their reminder time in their own zone, and marks them
 * in the same statement), push to each device, and drop those the push
 * service says are gone.
 */
export async function sendDueReminders(env: Env): Promise<void> {
  // Deployed before its settings were added: nothing to do yet. Checked
  // before claiming, so nothing is marked sent without being sent.
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

  const alerts = (
    await rpc<OvertakenAlert>(env, 'overtaken_alerts', {
      p_limit: ALERT_MEMBERS_PER_RUN,
    })
  ).slice(0, PUSH_BUDGET)
  const due = await rpc<DueReminder>(env, 'due_reminders', {
    p_limit: PUSH_BUDGET - alerts.length,
  })

  const pushes: Push[] = [
    ...alerts.map((row) => ({
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
      data: overtakenPayload(row),
      // Stale after a few hours: the race has moved on.
      // A Topic header is at most 32 URL-safe characters.
      options: {
        ttl: 4 * 3600,
        topic: `ot-${row.challenge_id.replace(/-/g, '').slice(0, 29)}`,
      },
    })),
    ...due.map((row) => ({
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
      data: notificationPayload(row.lang, row.origin),
      options: { ttl: 7200, topic: 'daily-reminder' },
    })),
  ]
  if (pushes.length === 0) return

  const vapid: VapidKeys = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
  }
  const results = await Promise.allSettled(
    pushes.map(async (push) => {
      const payload = await buildPushPayload(
        {
          data: push.data,
          options: { ...push.options, urgency: 'normal' },
        },
        {
          endpoint: push.endpoint,
          expirationTime: null,
          keys: { p256dh: push.p256dh, auth: push.auth },
        },
        vapid,
      )
      const res = await fetch(push.endpoint, payload)
      const outcome = classify(res.status)
      if (outcome === 'failed') {
        console.warn(
          `push: ${new URL(push.endpoint).host} answered ${res.status}`,
        )
      }
      return outcome
    }),
  )

  const gone = [
    ...new Set(
      pushes
        .filter((_, i) => {
          const r = results[i]
          return r.status === 'fulfilled' && r.value === 'gone'
        })
        .map((push) => push.endpoint),
    ),
  ]
  if (gone.length > 0) {
    // One request for all of them: a cron run gets 50 subrequests.
    const del = await supabaseFetch(
      env,
      `push_subscriptions?endpoint=${encodeURIComponent(inFilter(gone))}`,
      { method: 'DELETE' },
    )
    if (!del.ok) console.error(`push: delete ${del.status}`)
  }

  const count = (o: string) =>
    results.filter((r) => r.status === 'fulfilled' && r.value === o).length
  const errors = results.filter((r) => r.status === 'rejected')
  for (const e of errors.slice(0, 3)) console.error('push:', e.reason)
  console.log(
    `push: alerts ${alerts.length}, reminders ${due.length}, sent ${count('sent')}, gone ${gone.length}, failed ${count('failed') + errors.length}`,
  )
}
