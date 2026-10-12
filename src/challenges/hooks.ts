import { useMemo } from 'react'
import { usePolling, type Polled } from '../lib/usePolling.ts'
import { useSession, useSyncStatus } from '../sync/index.ts'
import { fetchLeaderboard, fetchMyChallenges } from './api.ts'
import type { ChallengeSummary, LeaderboardRow } from './types.ts'

/** All challenges the user is in, refreshed every 30 s, on focus and after each sync. */
export function useMyChallenges(): Polled<ChallengeSummary[]> & {
  userId: string | null
} {
  const { session, ready } = useSession()
  const { lastSyncAt } = useSyncStatus()
  const userId = session?.user.id ?? null
  const polled = usePolling(fetchMyChallenges, [userId, lastSyncAt], {
    enabled: ready && userId !== null,
  })
  // Signed out: nothing to load, report an empty list rather than "loading".
  const data = useMemo(
    () => (ready && userId === null ? [] : polled.data),
    [ready, userId, polled.data],
  )
  return { ...polled, data, loading: !ready || polled.loading, userId }
}

export function useChallengeSummary(id: string | undefined) {
  const all = useMyChallenges()
  const data = useMemo(() => all.data?.find((c) => c.id === id), [all.data, id])
  return { ...all, data, missing: all.data !== undefined && data === undefined }
}

export function useLeaderboard(
  challengeId: string | undefined,
): Polled<LeaderboardRow[]> {
  const { lastSyncAt } = useSyncStatus()
  return usePolling(
    () => (challengeId ? fetchLeaderboard(challengeId) : Promise.resolve([])),
    [challengeId, lastSyncAt],
    { enabled: challengeId !== undefined },
  )
}
