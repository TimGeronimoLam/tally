/**
 * Tiny broadcast for "something in the local database changed".
 * The db layer emits; the sync engine listens. Keeps db free of any
 * knowledge of Supabase.
 */
const listeners = new Set<() => void>()

export function onLocalChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyLocalChange(): void {
  for (const l of listeners) l()
}
