import { getMeta, setMeta } from '../db/meta.ts'
import { META_KEYS } from '../db/types.ts'
import { isWon } from './logic.ts'
import type { ChallengeSummary } from './types.ts'

/** Counts the social achievements look at. Cached locally in meta. */
export interface SocialStats {
  joined: number
  hosted: number
  won: number
}

export const EMPTY_SOCIAL: SocialStats = { joined: 0, hosted: 0, won: 0 }

export function socialStatsFrom(
  challenges: ChallengeSummary[],
  userId: string,
  now: number = Date.now(),
): SocialStats {
  return {
    joined: challenges.length,
    hosted: challenges.filter((c) => c.creatorId === userId).length,
    won: challenges.filter((c) => isWon(c, now)).length,
  }
}

export async function readSocialStats(): Promise<SocialStats> {
  return (await getMeta<SocialStats>(META_KEYS.socialStats)) ?? EMPTY_SOCIAL
}

/** Only ever grows, so a temporary empty fetch cannot revoke progress. */
export async function recordSocialStats(stats: SocialStats): Promise<void> {
  const prev = await readSocialStats()
  const next = {
    joined: Math.max(prev.joined, stats.joined),
    hosted: Math.max(prev.hosted, stats.hosted),
    won: Math.max(prev.won, stats.won),
  }
  if (
    next.joined !== prev.joined ||
    next.hosted !== prev.hosted ||
    next.won !== prev.won
  ) {
    await setMeta(META_KEYS.socialStats, next)
  }
}
