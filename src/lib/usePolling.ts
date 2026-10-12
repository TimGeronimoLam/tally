import { useCallback, useEffect, useRef, useState } from 'react'
import { getMeta, setMeta } from '../db/meta.ts'

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
  /**
   * Persist the last result under this key so the next mount (or reload)
   * shows it immediately instead of a loading state. Include anything the
   * result depends on (user id, challenge id) in the key.
   */
  cacheKey?: string
}

/** Last successful result per cache key, for synchronous hydration. */
const memory = new Map<string, unknown>()

/**
 * Fetch on mount, every `intervalMs`, when the tab becomes visible, and
 * whenever `deps` change. Good enough for leaderboards; swap for Realtime
 * later if needed.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  { intervalMs = 30_000, enabled = true, cacheKey }: PollingOptions = {},
): Polled<T> {
  const [data, setData] = useState<T | undefined>(() =>
    cacheKey ? (memory.get(cacheKey) as T | undefined) : undefined,
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(enabled)
  const latest = useRef(fetcher)
  latest.current = fetcher
  const key = useRef(cacheKey)
  key.current = cacheKey

  const refresh = useCallback(async () => {
    if (!enabled) return
    try {
      const result = await latest.current()
      setData(result)
      setError(null)
      if (key.current) {
        memory.set(key.current, result)
        void setMeta(key.current, result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [enabled])

  // Hydrate from cache when the key changes: memory first, then IndexedDB.
  useEffect(() => {
    if (!cacheKey) return
    const cached = memory.get(cacheKey) as T | undefined
    setData(cached)
    if (cached !== undefined) return
    let cancelled = false
    void getMeta<T>(cacheKey).then((stored) => {
      if (cancelled || stored === undefined) return
      if (!memory.has(cacheKey)) memory.set(cacheKey, stored)
      // A fetch may have landed first; never overwrite fresh data with stale.
      setData((prev) => prev ?? stored)
    })
    return () => {
      cancelled = true
    }
  }, [cacheKey])

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
