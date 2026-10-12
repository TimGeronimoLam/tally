import type { Session } from '@supabase/supabase-js'
import { getMeta, setMeta } from '../db/meta.ts'
import { META_KEYS } from '../db/types.ts'
import { supabase } from '../lib/supabase.ts'

export const DISPLAY_NAME_MAX = 24

/**
 * Save the display name locally and, when signed in, in Supabase user
 * metadata so it follows the account to other phones.
 */
export async function setDisplayName(name: string): Promise<void> {
  const trimmed = name.trim().slice(0, DISPLAY_NAME_MAX)
  await setMeta(META_KEYS.displayName, trimmed)
  if (!supabase) return
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return
  const { error } = await supabase.auth.updateUser({
    data: { display_name: trimmed },
  })
  if (error) console.warn('display name not saved to account', error.message)
}

/**
 * On sign-in: adopt the account's name if this phone has none, or push this
 * phone's name to an account that has none.
 */
export async function reconcileDisplayName(session: Session): Promise<void> {
  const remote = session.user.user_metadata?.display_name
  const local = (await getMeta<string>(META_KEYS.displayName)) ?? ''
  if (typeof remote === 'string' && remote && !local) {
    await setMeta(META_KEYS.displayName, remote)
  } else if (local && !remote && supabase) {
    await supabase.auth.updateUser({ data: { display_name: local } })
  }
}
