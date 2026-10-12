import { challengeSubtitle, isWon, ordinal } from '../../challenges/logic.ts'
import type { ChallengeSummary } from '../../challenges/types.ts'
import { cn } from '../../lib/cn.ts'
import { formatNumber } from '../../lib/format.ts'
import { Card, ProgressBar } from '../ui/index.ts'
import { LeaderboardList } from './LeaderboardList.tsx'

export interface ChallengeCardProps {
  challenge: ChallengeSummary
  meId: string | null
}

/** Active challenge: leaderboard preview (most reps) or goal progress (first to). */
export function ChallengeCard({ challenge: c, meId }: ChallengeCardProps) {
  const leading = c.myRank === 1
  return (
    <Card to={`/challenges/${c.id}`} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[17px] font-semibold">{c.name}</span>
          <span className="text-[13px] text-muted">
            {challengeSubtitle(c, { memberCount: c.memberCount })}
          </span>
        </div>
        <RankPill rank={c.myRank} highlight={leading} />
      </div>

      {c.goalType === 'first_to' ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px]">
            <span className="font-semibold">You</span>
            <span>
              {formatNumber(c.myTotal)} / {formatNumber(c.goalValue ?? 0)}
            </span>
          </div>
          <ProgressBar
            value={c.myTotal}
            max={c.goalValue ?? 1}
            aria-label="Progress to goal"
          />
        </div>
      ) : (
        <>
          <LeaderboardList rows={c.top} meId={meId} compact />
          {c.memberCount > c.top.length && (
            <span className="pl-8 text-[13px] text-muted">
              {c.memberCount - c.top.length} more
            </span>
          )}
        </>
      )}
    </Card>
  )
}

/** Past challenge: one line with the final placing. */
export function PastChallengeRow({ challenge: c }: ChallengeCardProps) {
  const won = isWon(c)
  return (
    <Card
      variant="outline"
      to={`/challenges/${c.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3.5"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{c.name}</span>
        <span className="text-[13px] text-muted">{challengeSubtitle(c)}</span>
      </div>
      <span
        className={cn(
          'shrink-0 text-[13px] font-medium',
          won ? 'text-accent-text' : 'text-muted',
        )}
      >
        {won ? 'Won' : `${ordinal(c.myRank)} of ${c.memberCount}`}
      </span>
    </Card>
  )
}

export function RankPill({
  rank,
  highlight,
}: {
  rank: number
  highlight?: boolean
}) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-md px-2 py-1 text-xs font-semibold',
        highlight ? 'bg-accent text-accent-fg' : 'bg-border text-fg',
      )}
    >
      {ordinal(rank)}
    </span>
  )
}
