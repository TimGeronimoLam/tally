import { useSyncExternalStore } from 'react'

function subscribe(cb: () => void) {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}

/** Browser connectivity. Logging works regardless; sync waits for `true`. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine)
}
