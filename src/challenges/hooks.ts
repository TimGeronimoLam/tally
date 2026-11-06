import { useMemo } from 'react'
import { isSyncConfigured } from '../lib/supabase.ts'
import { usePolling, type Polled } from '../lib/usePolling.ts'
import { useSession, useSyncStatus } from '../sync/index.ts'
import {
  fetchLeaderboard,
  fetchMemberDays,
  fetchMyChallenges,
  fetchPublicChallenges,
} from './api.ts'
import type {
  ChallengeSummary,
  LeaderboardRow,
  MemberDay,
  PublicChallenge,
} from './types.ts'

/** All challenges the user is in, refreshed every 30 s, on focus and after each sync. */
export function useMyChallenges(): Polled<ChallengeSummary[]> & {
  userId: string | null
} {
  const { session, ready } = useSession()
  const { lastSyncAt } = useSyncStatus()
  const userId = session?.user.id ?? null
  const polled = usePolling(fetchMyChallenges, [userId, lastSyncAt], {
    enabled: ready && userId !== null,
    cacheKey: userId ? `cache.challenges.${userId}` : undefined,
  })
  // Signed out: nothing to load, report an empty list rather than "loading".
  const data = useMemo(
    () => (ready && userId === null ? [] : polled.data),
    [ready, userId, polled.data],
  )
  return { ...polled, data, loading: !ready || polled.loading, userId }
}

/**
 * Public challenges to browse, signed in or not. Refreshed like the
 * user's own list; ones they are in are left out.
 */
export function usePublicChallenges(): Polled<PublicChallenge[]> {
  const { session, ready } = useSession()
  const userId = session?.user.id ?? null
  return usePolling(fetchPublicChallenges, [userId], {
    enabled: ready && isSyncConfigured,
    cacheKey: `cache.publicChallenges.${userId ?? 'none'}`,
  })
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
    {
      enabled: challengeId !== undefined,
      cacheKey: challengeId ? `cache.leaderboard.${challengeId}` : undefined,
    },
  )
}

/** One member's day totals in a challenge, refreshed like the leaderboard. */
export function useMemberDays(
  challengeId: string | undefined,
  userId: string | undefined,
): Polled<MemberDay[]> {
  const { lastSyncAt } = useSyncStatus()
  const enabled = challengeId !== undefined && userId !== undefined
  return usePolling(
    () =>
      enabled ? fetchMemberDays(challengeId, userId) : Promise.resolve([]),
    [challengeId, userId, lastSyncAt],
    {
      enabled,
      cacheKey: enabled
        ? `cache.memberDays.${challengeId}.${userId}`
        : undefined,
    },
  )
}
