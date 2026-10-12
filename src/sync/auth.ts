import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase.ts'
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
      window.setTimeout(() => void syncNow(), 0)
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

/**
 * Attach an email to the current (anonymous) account. Supabase emails a
 * confirmation link; once clicked, the same user id carries the email.
 */
export async function addEmail(email: string): Promise<void> {
  const { error } = await requireClient().auth.updateUser({ email })
  if (error) throw error
}

/** Magic-link sign-in for an account that already has an email. */
export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await requireClient().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
      shouldCreateUser: false,
    },
  })
  if (error) throw error
}

/** Ends the session. Local data stays on the device. */
export async function signOut(): Promise<void> {
  const { error } = await requireClient().auth.signOut()
  if (error) throw error
}
