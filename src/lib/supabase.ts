import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Accept a pasted REST/Auth endpoint too: only the origin matters.
const url = toOrigin(import.meta.env.VITE_SUPABASE_URL)
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function toOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

/**
 * Supabase client, or null when the env vars are missing. The app is
 * local-first: everything works without it, sync and challenges just stay off.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null

export const isSyncConfigured = supabase !== null
