import { useCallback, useEffect, useRef, useState } from 'react'
import { getMeta, setMeta } from '../db/meta.ts'
import { recordError } from './diagnostics.ts'
import { retryDelay } from './retry.ts'

export interface Polled<T> {
  data: T | undefined
  /** True until the first successful load (failed loads keep retrying). */
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
 * later if needed. A failed load is never shown: the last good data stays
 * up and the load is retried soon, backing off up to `intervalMs`. The
 * first failure in a row goes to the diagnostics log.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  { intervalMs = 30_000, enabled = true, cacheKey }: PollingOptions = {},
): Polled<T> {
  const [data, setData] = useState<T | undefined>(() =>
    cacheKey ? (memory.get(cacheKey) as T | undefined) : undefined,
  )
  const [loading, setLoading] = useState(enabled)
  const latest = useRef(fetcher)
  latest.current = fetcher
  const key = useRef(cacheKey)
  key.current = cacheKey
  const failures = useRef(0)
  const retry = useRef<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    if (!enabled) return
    window.clearTimeout(retry.current)
    retry.current = undefined
    try {
      const result = await latest.current()
      failures.current = 0
      setData(result)
      setLoading(false)
      if (key.current) {
        memory.set(key.current, result)
        void setMeta(key.current, result)
      }
    } catch (err) {
      failures.current += 1
      if (failures.current === 1) recordError('poll', err)
      // A refresh that started meanwhile may already have queued one.
      if (retry.current === undefined) {
        retry.current = window.setTimeout(
          () => void refresh(),
          retryDelay(failures.current, intervalMs),
        )
      }
    }
  }, [enabled, intervalMs])

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
      window.clearTimeout(retry.current)
      retry.current = undefined
      failures.current = 0
      document.removeEventListener('visibilitychange', onVisible)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's
  }, [enabled, intervalMs, refresh, ...deps])

  return { data, loading, refresh }
}
