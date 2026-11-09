import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useSyncExternalStore } from 'react'
import { db } from '../db/index.ts'
import { APP_VERSION } from './releases.ts'

/**
 * The last version this device was told about. Per device, like the
 * install hint: an update is news on each phone it reaches.
 */
const SEEN_KEY = 'tally.seenVersion'

/** Stands in for storage when it is unavailable, so a dismissal still sticks. */
let fallback: string | null = null
const listeners = new Set<() => void>()

export function readSeenVersion(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY) ?? fallback
  } catch {
    return fallback
  }
}

export function markVersionSeen(): void {
  fallback = APP_VERSION
  try {
    localStorage.setItem(SEEN_KEY, APP_VERSION)
  } catch {
    // ignore
  }
  for (const l of listeners) l()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Whether this build is news to the device: it last saw an older version,
 * or it was in use before versions were recorded at all. A fresh install
 * has nothing to catch up on and is marked seen on its first launch.
 */
export function useWhatsNewPending(): {
  pending: boolean
  dismiss: () => void
} {
  const seen = useSyncExternalStore(subscribe, readSeenVersion)
  // Any entry, deleted or not, means the device was in use before.
  const entries = useLiveQuery(() => db.entries.count(), [])

  useEffect(() => {
    if (seen === null && entries === 0) markVersionSeen()
  }, [seen, entries])

  const pending =
    seen === null ? entries !== undefined && entries > 0 : seen !== APP_VERSION
  return { pending, dismiss: markVersionSeen }
}
