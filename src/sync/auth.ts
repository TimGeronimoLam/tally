import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase.ts'
import { reconcileDisplayName } from './profile.ts'
import { syncNow } from './sync.ts'

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
      }, 0)
    }
  })
}

function requireClient() {
  if (!supabase) throw new Error('Sync is not configured in this build')
  return supabase
}

/** Create a silent account tied to this device. */
export async function signInAnonymously(): Promise<void> {
  const { error } = await requireClient().auth.signInAnonymously()
  if (error) throw error
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
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
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
  if (token.length < 6) throw new Error('Enter the whole code from the email')
  const { error } = await requireClient().auth.verifyOtp({ email, token, type })
  if (error) {
    throw new Error(
      /expired|invalid/i.test(error.message)
        ? 'That code is wrong or has expired. Ask for a new one.'
        : error.message,
    )
  }
}

/** Ends the session. Local data stays on the device. */
export async function signOut(): Promise<void> {
  const { error } = await requireClient().auth.signOut()
  if (error) throw error
}
