import { useSyncExternalStore } from 'react'

export type SyncState = 'idle' | 'syncing' | 'error'

export interface SyncStatus {
  state: SyncState
  /** Epoch ms of the last successful sync in this session, or null. */
  lastSyncAt: number | null
  error: string | null
}

let status: SyncStatus = { state: 'idle', lastSyncAt: null, error: null }
const listeners = new Set<() => void>()

export function getSyncStatus(): SyncStatus {
  return status
}

export function setSyncStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch }
  for (const l of listeners) l()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, getSyncStatus)
}
