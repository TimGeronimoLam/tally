import { useCallback, useEffect, useRef, useState } from 'react'

export interface Polled<T> {
  data: T | undefined
  error: string | null
  loading: boolean
  refresh: () => Promise<void>
}

export interface PollingOptions {
  intervalMs?: number
  /** When false, nothing is fetched and `data` stays undefined. */
  enabled?: boolean
}

/**
 * Fetch on mount, every `intervalMs`, when the tab becomes visible, and
 * whenever `deps` change. Good enough for leaderboards; swap for Realtime
 * later if needed.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  { intervalMs = 30_000, enabled = true }: PollingOptions = {},
): Polled<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled)
  const latest = useRef(fetcher)
  latest.current = fetcher

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      setData(await latest.current())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's
  }, [enabled, intervalMs, refresh, ...deps])

  return { data, error, loading, refresh }
}
