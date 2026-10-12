/**
 * Last-error memory for a device with no console. Startup trouble, sync
 * failures, uncaught errors and render crashes land here; the Account
 * screen shows the newest one so it can be read off the phone.
 */

const KEY = 'tally.lastError'

export interface LastError {
  at: number
  where: string
  message: string
}

export function recordError(where: string, err: unknown): void {
  const message =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === 'string'
        ? err
        : JSON.stringify(err)
  console.error(`[tally] ${where}:`, err)
  try {
    const entry: LastError = { at: Date.now(), where, message }
    localStorage.setItem(KEY, JSON.stringify(entry))
  } catch {
    // Storage unavailable: the console line above is all we get.
  }
}

export function readLastError(): LastError | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LastError) : null
  } catch {
    return null
  }
}

export function clearLastError(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/** Catch what nothing else catches. Call once at startup. */
export function installErrorCapture(): void {
  window.addEventListener('error', (e) =>
    recordError('window', e.error ?? e.message),
  )
  window.addEventListener('unhandledrejection', (e) =>
    recordError('promise', e.reason),
  )
}
