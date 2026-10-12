import { useNavigate, useParams } from 'react-router'
import {
  challengeStatus,
  daysLeft,
  gapToFirst,
  inviteUrl,
  useChallengeSummary,
  useLeaderboard,
} from '../challenges/index.ts'
import { InviteCodeCard, LeaderboardList } from '../components/app/index.ts'
import {
  Button,
  ChevronLeftIcon,
  Gutter,
  IconButton,
  Screen,
  SectionLabel,
  ShareIcon,
  Tile,
  TileGrid,
} from '../components/ui/index.ts'
import { META_KEYS, setMeta } from '../db/index.ts'
import { formatNumber } from '../lib/format.ts'
import { shareLink } from '../lib/share.ts'
import { useToast } from '../lib/toast.ts'

function windowLabel(startsAt: string, endsAt: string): string {
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    })
  return `${fmt(startsAt)} – ${fmt(endsAt)}`
}

export function ChallengeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: c, missing, loading, userId } = useChallengeSummary(id)
  const board = useLeaderboard(c?.id)

  if (missing) {
    return (
      <Screen>
        <Header onBack={() => navigate('/challenges')} />
        <Gutter className="pt-4 text-[15px] text-muted">
          This challenge is not on your list.
        </Gutter>
      </Screen>
    )
  }
  if (!c) {
    return (
      <Screen>
        <Header onBack={() => navigate('/challenges')} />
        {loading && (
          <Gutter className="pt-4 text-[15px] text-muted">Loading…</Gutter>
        )}
      </Screen>
    )
  }

  const status = challengeStatus(c)
  const rows = board.data ?? c.top
  const unit = c.unit === 'reps' ? 'reps' : c.unit

  async function share() {
    const outcome = await shareLink({
      title: `Join ${c!.name} on Tally`,
      text: `Join my challenge "${c!.name}" with code ${c!.inviteCode}`,
      url: inviteUrl(c!.inviteCode),
    })
    if (outcome === 'copied') toast({ message: 'Link copied' })
  }

  async function logThis() {
    await setMeta(META_KEYS.lastExerciseId, c!.myExerciseId)
    navigate('/')
  }

  return (
    <Screen>
      <Header
        onBack={() => navigate('/challenges')}
        action={
          <IconButton aria-label="Share challenge" onClick={share}>
            <ShareIcon />
          </IconButton>
        }
      />

      <Gutter className="flex flex-col gap-1 pt-2">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
          {c.name}
        </h1>
        <span className="text-sm text-muted">
          {c.exerciseName} ·{' '}
          {c.goalType === 'first_to'
            ? `First to ${formatNumber(c.goalValue ?? 0)} wins`
            : 'Most reps wins'}{' '}
          · {windowLabel(c.startsAt, c.endsAt)}
        </span>
      </Gutter>

      <Gutter className="pt-5">
        <TileGrid>
          <Tile
            label={status === 'ended' ? 'Ended' : 'Days left'}
            value={status === 'ended' ? '—' : daysLeft(c)}
          />
          <Tile label={`Your ${unit}`} value={formatNumber(c.myTotal)} />
          {c.goalType === 'first_to' ? (
            <Tile
              label="To goal"
              value={formatNumber(Math.max(0, (c.goalValue ?? 0) - c.myTotal))}
              emphasis
            />
          ) : (
            <Tile
              label={c.myRank === 1 ? 'Lead' : 'To 1st'}
              value={formatNumber(
                c.myRank === 1
                  ? c.myTotal - (rows[1]?.total ?? 0)
                  : gapToFirst(c),
              )}
              emphasis
            />
          )}
        </TileGrid>
      </Gutter>

      <Gutter>
        <div className="flex items-center justify-between pt-6 pb-2">
          <SectionLabel className="pt-0 pb-0">Leaderboard</SectionLabel>
          {board.error && (
            <span className="text-xs text-danger">{board.error}</span>
          )}
        </div>
        <LeaderboardList rows={rows} meId={userId} />
      </Gutter>

      <Gutter className="pt-5">
        <InviteCodeCard code={c.inviteCode} challengeName={c.name} />
      </Gutter>

      <div className="flex-1" />

      {status !== 'ended' && (
        <Gutter className="pt-6 pb-[calc(20px_+_env(safe-area-inset-bottom))]">
          <Button size="lg" fullWidth onClick={logThis}>
            Log {c.exerciseName.toLowerCase()}
          </Button>
        </Gutter>
      )}
    </Screen>
  )
}

function Header({
  onBack,
  action,
}: {
  onBack: () => void
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)_+_8px)]">
      <IconButton aria-label="Back to challenges" onClick={onBack}>
        <ChevronLeftIcon />
      </IconButton>
      {action ?? <span className="size-11" />}
    </div>
  )
}
