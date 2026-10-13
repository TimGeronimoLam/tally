import { messages } from '../i18n/index.ts'

/**
 * Cloudflare Turnstile in front of the Supabase Auth calls that mint
 * accounts or send email: anonymous sign-in (challenge join, reminder) and
 * the sign-in code. Supabase checks the token itself with the secret from
 * its dashboard (Authentication → Attack Protection → Captcha), so only
 * the public site key lives here. Without a site key no token is made and
 * the calls go out bare, which Supabase accepts while its captcha is off.
 *
 * The widget is invisible while Cloudflare is satisfied and only appears,
 * at the bottom of the screen above the tab bar, when it needs a tap.
 * Tokens are single use: every call renders a fresh widget and removes it
 * once the token is in.
 */

/** Names the protected surface; Cloudflare shows it in its analytics. */
export type CaptchaAction = 'anonymous' | 'email' | 'reminder'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || undefined
const ONLOAD = '__tallyTurnstileReady'
const SCRIPT_URL = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${ONLOAD}`
const HOST_ID = 'captcha'

export const isCaptchaConfigured = SITE_KEY !== undefined

interface RenderOptions {
  sitekey: string
  action?: string
  appearance?: 'always' | 'execute' | 'interaction-only'
  theme?: 'light' | 'dark' | 'auto'
  language?: string
  retry?: 'auto' | 'never'
  callback?: (token: string) => void
  'error-callback'?: (code: string) => boolean | void
  'expired-callback'?: () => void
  'timeout-callback'?: () => void
  'unsupported-callback'?: () => void
}

interface Turnstile {
  render(container: HTMLElement, options: RenderOptions): string | undefined
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: Turnstile
    [ONLOAD]?: () => void
  }
}

function failure(): Error {
  return new Error(messages().errors.captchaFailed)
}

/** Supabase's own wording when a token is missing, reused or rejected. */
export function isCaptchaError(err: { message: string }): boolean {
  return /captcha/i.test(err.message)
}

let loading: Promise<Turnstile> | null = null

/** Load the Turnstile script once. Rejects offline; a later call retries. */
function load(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (loading) return loading
  loading = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script')
    window[ONLOAD] = () => {
      delete window[ONLOAD]
      if (window.turnstile) resolve(window.turnstile)
      else reject(failure())
    }
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onerror = () => {
      delete window[ONLOAD]
      script.remove()
      loading = null
      reject(failure())
    }
    document.head.appendChild(script)
  })
  return loading
}

/**
 * Lives outside #root so an open sheet (which makes #root inert) cannot
 * block the tap; above the sheet's scrim (z-40), below nothing.
 */
function host(): HTMLElement {
  let el = document.getElementById(HOST_ID)
  if (!el) {
    el = document.createElement('div')
    el.id = HOST_ID
    el.style.cssText =
      'position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 72px);' +
      'z-index:50;display:flex;justify-content:center;pointer-events:none'
    document.body.appendChild(el)
  }
  return el
}

export interface CaptchaOptions {
  /**
   * Give up after this long. For silent, unattended calls, so a widget
   * nobody taps cannot hold the caller's queue forever.
   */
  timeoutMs?: number
}

/**
 * A fresh token for one Supabase Auth call, or undefined when no site key
 * is configured. Rejects with a translated message when the script will
 * not load, the widget fails or the time runs out.
 */
export function captchaToken(
  action: CaptchaAction,
  options: CaptchaOptions = {},
): Promise<string | undefined> {
  if (!SITE_KEY) return Promise.resolve(undefined)
  const sitekey = SITE_KEY
  return load().then(
    (turnstile) =>
      new Promise<string>((resolve, reject) => {
        const slot = document.createElement('div')
        slot.style.pointerEvents = 'auto'
        host().appendChild(slot)
        let widgetId: string | undefined
        let timer: number | undefined
        let settled = false

        const finish = (outcome: () => void) => {
          if (settled) return
          settled = true
          window.clearTimeout(timer)
          outcome()
          // Not inside the widget's own callback: let it unwind first.
          window.setTimeout(() => {
            if (widgetId) turnstile.remove(widgetId)
            slot.remove()
          }, 0)
        }
        const fail = () => finish(() => reject(failure()))

        try {
          widgetId = turnstile.render(slot, {
            sitekey,
            action,
            appearance: 'interaction-only',
            theme:
              document.documentElement.dataset.theme === 'dark'
                ? 'dark'
                : 'light',
            language: document.documentElement.lang || 'auto',
            retry: 'never',
            callback: (token) => finish(() => resolve(token)),
            'error-callback': () => {
              fail()
              return true
            },
            'timeout-callback': fail,
            'unsupported-callback': fail,
          })
        } catch {
          widgetId = undefined
        }
        if (widgetId === undefined) {
          fail()
          return
        }
        if (options.timeoutMs) {
          timer = window.setTimeout(fail, options.timeoutMs)
        }
      }),
  )
}
