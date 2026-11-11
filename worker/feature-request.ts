/**
 * POST /api/feature-request: the "Request a feature" form in Account. The
 * Worker checks the Turnstile token, then emails the request through
 * Resend (https://resend.com) to FEEDBACK_TO. The address lives in the
 * Worker's settings, not in this public repo. See README "Feature requests".
 */

export interface FeatureRequestEnv {
  /** Resend API key (secret). */
  RESEND_API_KEY?: string
  /** Where requests go. */
  FEEDBACK_TO?: string
  /**
   * Sender. Defaults to Resend's shared test sender, which may only mail
   * the address the Resend account was opened with.
   */
  FEEDBACK_FROM?: string
  /** Turnstile secret key; without it the token is not checked. */
  TURNSTILE_SECRET_KEY?: string
}

export const MAX_MESSAGE = 4000
const MAX_FIELD = 200
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DEFAULT_FROM = 'Tally <onboarding@resend.dev>'

export interface FeatureRequest {
  message: string
  /** Optional reply-to address the sender typed. */
  email?: string
  captcha?: string
  lang?: string
  version?: string
}

/** Pick and check the fields of a request body; a string names the fault. */
export function parseFeatureRequest(body: unknown): FeatureRequest | string {
  if (!body || typeof body !== 'object') return 'body must be a JSON object'
  const b = body as Record<string, unknown>
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const message = str(b.message)
  if (!message) return 'message is required'
  if (message.length > MAX_MESSAGE) return 'message is too long'
  const email = str(b.email)
  if (email && (email.length > MAX_FIELD || !EMAIL.test(email))) {
    return 'email is not valid'
  }
  return {
    message,
    email: email || undefined,
    captcha: str(b.captcha).slice(0, 2048) || undefined,
    lang: str(b.lang).slice(0, 16) || undefined,
    version: str(b.version).slice(0, 32) || undefined,
  }
}

/** The email Resend sends: plain text, the request's first line as subject. */
export function featureRequestEmail(
  req: FeatureRequest,
  meta: { from: string; to: string; userAgent?: string },
) {
  const firstLine = req.message.split('\n')[0]
  const subject =
    firstLine.length > 60 ? `${firstLine.slice(0, 59)}…` : firstLine
  const details = [
    `From: ${req.email ?? 'not given'}`,
    `Language: ${req.lang ?? 'unknown'}`,
    `Version: ${req.version ?? 'unknown'}`,
    meta.userAgent && `Browser: ${meta.userAgent.slice(0, MAX_FIELD)}`,
  ].filter(Boolean)
  return {
    from: meta.from,
    to: [meta.to],
    subject: `Tally feature request: ${subject}`,
    text: `${req.message}\n\n--\n${details.join('\n')}`,
    ...(req.email ? { reply_to: req.email } : {}),
  }
}

function status(code: number, error?: string): Response {
  return error
    ? Response.json({ error }, { status: code })
    : new Response(null, { status: code })
}

async function turnstileOk(
  secret: string,
  token: string | undefined,
  ip: string | null,
): Promise<boolean> {
  if (!token) return false
  const form = new FormData()
  form.append('secret', secret)
  form.append('response', token)
  if (ip) form.append('remoteip', ip)
  const res = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body: form },
  )
  if (!res.ok) return false
  const result = (await res.json()) as { success?: boolean }
  return result.success === true
}

export async function handleFeatureRequest(
  request: Request,
  env: FeatureRequestEnv,
): Promise<Response> {
  if (request.method !== 'POST') return status(405, 'method not allowed')
  if (!env.RESEND_API_KEY || !env.FEEDBACK_TO) {
    console.warn('feature request: not configured')
    return status(503, 'not configured')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return status(400, 'body must be JSON')
  }
  const req = parseFeatureRequest(body)
  if (typeof req === 'string') return status(400, req)

  if (env.TURNSTILE_SECRET_KEY) {
    const ip = request.headers.get('cf-connecting-ip')
    if (!(await turnstileOk(env.TURNSTILE_SECRET_KEY, req.captcha, ip))) {
      return status(403, 'captcha failed')
    }
  }

  const email = featureRequestEmail(req, {
    from: env.FEEDBACK_FROM || DEFAULT_FROM,
    to: env.FEEDBACK_TO,
    userAgent: request.headers.get('user-agent') ?? undefined,
  })
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(email),
  })
  if (!res.ok) {
    console.error(`feature request: resend ${res.status} ${await res.text()}`)
    return status(502, 'could not send')
  }
  return status(204)
}
