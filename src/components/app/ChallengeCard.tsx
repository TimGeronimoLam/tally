import {
  challengeSubtitle,
  isWon,
  teamTotalOf,
} from '../../challenges/logic.ts'
import type {
  ChallengeSummary,
  PublicChallenge,
} from '../../challenges/types.ts'
import { useT } from '../../i18n/index.ts'
import { cn } from '../../lib/cn.ts'
import { formatNumber, formatPercent } from '../../lib/format.ts'
import { Card, ProgressBar } from '../ui/index.ts'
import { LeaderboardList } from './LeaderboardList.tsx'

export interface ChallengeCardProps {
  challenge: ChallengeSummary
  meId: string | null
}

/**
 * Active challenge: leaderboard preview (most reps), the caller's progress
 * (first to) or everyone's progress together (team).
 */
export function ChallengeCard({ challenge: c, meId }: ChallengeCardProps) {
  const t = useT()
  if (c.goalType === 'team') return <TeamChallengeCard challenge={c} />
  const leading = c.myRank === 1
  return (
    <Card to={`/challenges/${c.id}`} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[17px] font-semibold">{c.name}</span>
          <span className="text-[13px] text-muted">
            {challengeSubtitle(c, t, { memberCount: c.memberCount })}
          </span>
        </div>
        <RankPill rank={c.myRank} highlight={leading} />
      </div>

      {c.goalType === 'first_to' ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[13px]">
            <span className="font-semibold">
              {c.top.find((r) => r.userId === meId)?.displayName ??
                t.common.you}
            </span>
            <span>
              {formatNumber(c.myTotal)} / {formatNumber(c.goalValue ?? 0)}
            </span>
          </div>
          <ProgressBar
            value={c.myTotal}
            max={c.goalValue ?? 1}
            aria-label={t.challenges.progressToGoal}
          />
        </div>
      ) : (
        <>
          <LeaderboardList rows={c.top} meId={meId} compact />
          {c.memberCount > c.top.length && (
            <span className="pl-8 text-[13px] text-muted">
              {t.challenges.more(c.memberCount - c.top.length)}
            </span>
          )}
        </>
      )}
    </Card>
  )
}

function TeamChallengeCard({ challenge: c }: { challenge: ChallengeSummary }) {
  const t = useT()
  const total = teamTotalOf(c)
  const goal = c.goalValue ?? 0
  const reached = total >= goal
  return (
    <Card to={`/challenges/${c.id}`} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[17px] font-semibold">{c.name}</span>
          <span className="text-[13px] text-muted">
            {challengeSubtitle(c, t, { memberCount: c.memberCount })}
          </span>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-md px-2 py-1 text-xs font-semibold tabular-nums',
            reached ? 'bg-accent text-accent-fg' : 'bg-border text-fg',
          )}
        >
          {formatPercent(total, goal)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[13px]">
          <span className="font-semibold">
            {t.challenges.team} · {t.challenges.subtitle.people(c.memberCount)}
          </span>
          <span>
            {formatNumber(total)} / {formatNumber(goal)}
          </span>
        </div>
        <ProgressBar
          value={total}
          max={goal || 1}
          aria-label={t.challenges.teamProgress}
        />
      </div>
    </Card>
  )
}

/** Past challenge: one line with the final placing, or whether a team goal was met. */
export function PastChallengeRow({ challenge: c }: ChallengeCardProps) {
  const t = useT()
  const won = isWon(c)
  const outcome =
    c.goalType === 'team'
      ? won
        ? t.challenges.reached
        : t.challenges.missed
      : won
        ? t.challenges.won
        : t.challenges.placing(t.ordinal(c.myRank), c.memberCount)
  return (
    <Card
      variant="outline"
      to={`/challenges/${c.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3.5"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{c.name}</span>
        <span className="text-[13px] text-muted">
          {challengeSubtitle(c, t)}
        </span>
      </div>
      <span
        className={cn(
          'shrink-0 text-[13px] font-medium',
          won ? 'text-accent-text' : 'text-muted',
        )}
      >
        {outcome}
      </span>
    </Card>
  )
}

/** Public challenge the user is not in: opens the join page. */
export function PublicChallengeRow({
  challenge: c,
}: {
  challenge: PublicChallenge
}) {
  const t = useT()
  return (
    <Card
      variant="outline"
      to={`/join/${c.inviteCode}`}
      className="flex items-center justify-between gap-3 px-4 py-3.5"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[15px] font-semibold">{c.name}</span>
        <span className="text-[13px] text-muted">
          {challengeSubtitle(c, t)} ·{' '}
          {t.challenges.subtitle.people(c.memberCount)}
        </span>
      </div>
      <span className="shrink-0 rounded-md bg-inverse px-2.5 py-1 text-xs font-semibold text-inverse-fg">
        {t.challenges.join}
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
  const t = useT()
  return (
    <span
      className={cn(
        'shrink-0 rounded-md px-2 py-1 text-xs font-semibold',
        highlight ? 'bg-accent text-accent-fg' : 'bg-border text-fg',
      )}
    >
      {t.ordinal(rank)}
    </span>
  )
}
