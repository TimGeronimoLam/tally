import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { messages } from '../i18n/index.ts'
import { captchaToken, isCaptchaError } from '../lib/captcha.ts'
import { recordError } from '../lib/diagnostics.ts'
import { supabase } from '../lib/supabase.ts'
import { disableReminder, reconcileReminder } from '../reminders/index.ts'
import { clearAccountData } from '../db/maintenance.ts'
import { reconcileDisplayName } from './profile.ts'
import { setSyncStatus } from './status.ts'
import { cancelScheduledSync, hasUnsyncedRows, syncNow } from './sync.ts'

export interface AuthState {
  session: Session | null
  /** False until the first auth event has arrived. */
  ready: boolean
}

let state: AuthState = { session: null, ready: supabase === null }
const listeners = new Set<() => void>()

function set(next: AuthState) {
  state = next
  for (const l of listeners) l()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useSession(): AuthState {
  return useSyncExternalStore(subscribe, () => state)
}

/** Follow auth changes and sync whenever a session appears. Call once. */
export function initAuth(): void {
  if (!supabase) return
  supabase.auth.onAuthStateChange((event, session) => {
    set({ session, ready: true })
    // Supabase warns against awaiting its own calls inside this callback.
    if (session && event !== 'TOKEN_REFRESHED') {
      window.setTimeout(() => {
        void reconcileDisplayName(session)
        void syncNow()
        void reconcileReminder()
      }, 0)
    } else if (!session && event === 'INITIAL_SESSION') {
      // A reminder outlives a lost session: it signs in again silently.
      window.setTimeout(() => void reconcileReminder(), 0)
    }
  })
}

function requireClient() {
  if (!supabase) throw new Error(messages().errors.syncNotConfigured)
  return supabase
}

/** Create a silent account tied to this device. */
export async function signInAnonymously(): Promise<void> {
  const token = await captchaToken('anonymous')
  const { error } = await requireClient().auth.signInAnonymously({
    options: { captchaToken: token },
  })
  if (error) throw isCaptchaError(error) ? captchaFailed() : error
}

function captchaFailed(): Error {
  return new Error(messages().errors.captchaFailed)
}

/** Which one-time code the sign-in email carries; needed to verify it. */
export type EmailCodeType = 'email' | 'email_change'

/**
 * Start an email sign-in. The email carries a one-time code (the Supabase
 * templates render `{{ .Token }}` and no link, see README): on an iPhone a
 * link would open Safari rather than the installed app, whose storage is
 * separate, so the code is the only way to sign in inside it. Returns the
 * code type `verifyEmailCode` needs.
 *
 * The user never sees anonymous accounts, so:
 * - with an anonymous session (created silently by a challenge join), the
 *   email is attached to that same user via updateUser, keeping its id and
 *   memberships; Supabase emails a confirmation code;
 * - otherwise, or if that email already belongs to another account, a
 *   sign-in code is sent (creating the account on first use).
 */
export async function signInWithEmail(email: string): Promise<EmailCodeType> {
  const client = requireClient()
  const anonymous = state.session?.user.is_anonymous === true
  if (anonymous) {
    const { error } = await client.auth.updateUser({ email })
    if (!error) return 'email_change'
    if (!/already|registered|exists/i.test(error.message)) throw error
    // Fall through: the email has an account; sign into that one instead.
  }
  // Only this path sends mail to an address nobody has verified yet, so
  // only this path is behind the captcha; attaching to the anonymous
  // user above is not.
  const token = await captchaToken('email')
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin, captchaToken: token },
  })
  if (error) throw isCaptchaError(error) ? captchaFailed() : error
  return 'email'
}

/** Digits only; Supabase codes are 6 long but the length is configurable. */
export function normalizeEmailCode(input: string): string {
  return input.replace(/\D/g, '')
}

/**
 * Finish an email sign-in with the code from the email. Works inside an
 * installed app on any platform.
 */
export async function verifyEmailCode(
  email: string,
  code: string,
  type: EmailCodeType,
): Promise<void> {
  const token = normalizeEmailCode(code)
  if (token.length < 6) throw new Error(messages().sync.wholeCode)
  const { error } = await requireClient().auth.verifyOtp({ email, token, type })
  if (error) {
    throw new Error(
      /expired|invalid/i.test(error.message)
        ? messages().sync.codeWrong
        : error.message,
    )
  }
}

/**
 * Ends the session on this device and clears the account's rows from it;
 * the next sign-in pulls them again instead of pushing copies (owner.ts).
 * Pending local changes are pushed first: if that fails they would be
 * lost, so the sign-out is refused. The daily reminder goes off while the
 * session can still delete its row: signing out should not leave a server
 * identity pinging this phone.
 */
export async function signOut(): Promise<void> {
  const client = requireClient()
  const result = await syncNow()
  if (!result.ok && result.reason === 'failed' && (await hasUnsyncedRows())) {
    throw new Error(messages().sync.signOutUnsynced)
  }
  cancelScheduledSync()
  await disableReminder().catch((err) => recordError('reminder', err))
  // This device only: other phones keep their sessions.
  const { error } = await client.auth.signOut({ scope: 'local' })
  if (error) throw error
  await clearAccountData()
  setSyncStatus({ state: 'idle', lastSyncAt: null, error: null })
}
