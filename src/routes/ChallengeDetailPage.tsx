import { useState } from 'react'
import { useParams } from 'react-router'
import {
  challengeStatus,
  daysLeft,
  daysUntilStart,
  deleteChallenge,
  endChallenge,
  gapToFirst,
  inviteUrl,
  useChallengeSummary,
  useLeaderboard,
} from '../challenges/index.ts'
import { InviteCodeCard, LeaderboardList } from '../components/app/index.ts'
import {
  Button,
  ConfirmSheet,
  Gutter,
  IconButton,
  Screen,
  ScreenNav,
  SectionLabel,
  ShareIcon,
  Tile,
  TileGrid,
} from '../components/ui/index.ts'
import { META_KEYS, setMeta } from '../db/index.ts'
import { formatNumber } from '../lib/format.ts'
import { shareLink } from '../lib/share.ts'
import { useToast } from '../lib/toast.ts'
import { useNav } from '../lib/nav.ts'

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
  const nav = useNav()
  const toast = useToast()
  const { data: c, missing, loading, userId, refresh } = useChallengeSummary(id)
  const board = useLeaderboard(c?.id)
  const [confirm, setConfirm] = useState<'end' | 'delete' | null>(null)
  const [busy, setBusy] = useState(false)

  if (missing) {
    return (
      <Screen>
        <ScreenNav
          title="Challenge"
          backLabel="Back to challenges"
          onBack={() => nav.pop('/challenges')}
        />
        <Gutter className="pt-4 text-[15px] text-muted">
          This challenge is not on your list.
        </Gutter>
      </Screen>
    )
  }
  if (!c) {
    return (
      <Screen>
        <ScreenNav
          title="Challenge"
          backLabel="Back to challenges"
          onBack={() => nav.pop('/challenges')}
        />
        {loading && (
          <Gutter className="pt-4 text-[15px] text-muted">Loading…</Gutter>
        )}
      </Screen>
    )
  }

  const status = challengeStatus(c)
  const rows = board.data ?? c.top
  const unit = c.unit === 'reps' ? 'reps' : c.unit
  const isHost = userId !== null && c.creatorId === userId

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
    nav.pop('/')
  }

  async function endNow() {
    if (busy) return
    setBusy(true)
    try {
      await endChallenge(c!.id)
      await refresh()
      setConfirm(null)
      toast({ message: 'Challenge ended. Final standings are in.' })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Could not end' })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (busy) return
    setBusy(true)
    try {
      await deleteChallenge(c!.id)
      await refresh()
      setConfirm(null)
      toast({ message: 'Challenge deleted' })
      nav.pop('/challenges', { replace: true })
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : 'Could not delete',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScreenNav
        backLabel="Back to challenges"
        onBack={() => nav.pop('/challenges')}
        action={
          <IconButton aria-label="Share challenge" onClick={share}>
            <ShareIcon />
          </IconButton>
        }
        title={c.name}
      >
        <span className="text-sm text-muted">
          {c.exerciseName} ·{' '}
          {c.goalType === 'first_to'
            ? `First to ${formatNumber(c.goalValue ?? 0)} wins`
            : 'Most reps wins'}{' '}
          · {windowLabel(c.startsAt, c.endsAt)}
        </span>
      </ScreenNav>

      <Gutter className="pt-5">
        <TileGrid>
          {status === 'ended' ? (
            <Tile label="Ended" value="—" />
          ) : status === 'upcoming' ? (
            <Tile label="Starts in" value={daysUntilStart(c)} />
          ) : (
            <Tile label="Days left" value={daysLeft(c)} />
          )}
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

      {isHost && (
        <Gutter className="pt-5">
          <SectionLabel>Host</SectionLabel>
          <div className="flex flex-col gap-1 pt-1">
            {status === 'active' && (
              <Button
                variant="outline"
                fullWidth
                onClick={() => setConfirm('end')}
              >
                End challenge now
              </Button>
            )}
            <Button
              variant="danger"
              fullWidth
              onClick={() => setConfirm('delete')}
            >
              Delete challenge
            </Button>
          </div>
        </Gutter>
      )}

      <div className="flex-1" />

      {status !== 'ended' && (
        <Gutter className="pt-6 pb-5">
          <Button size="lg" fullWidth onClick={logThis}>
            Log {c.exerciseName.toLowerCase()}
          </Button>
        </Gutter>
      )}

      <ConfirmSheet
        open={confirm === 'end'}
        title="End challenge now?"
        message={`"${c.name}" closes for everyone right away. Totals so far become the final standings. This cannot be undone.`}
        confirmLabel={busy ? 'Ending…' : 'End challenge'}
        onConfirm={endNow}
        onClose={() => !busy && setConfirm(null)}
      />
      <ConfirmSheet
        open={confirm === 'delete'}
        title="Delete challenge?"
        message={`"${c.name}" and its leaderboard are removed for all ${c.memberCount} ${c.memberCount === 1 ? 'member' : 'members'}. Everyone keeps their logged reps. This cannot be undone.`}
        confirmLabel={busy ? 'Deleting…' : 'Delete challenge'}
        destructive
        onConfirm={remove}
        onClose={() => !busy && setConfirm(null)}
      />
    </Screen>
  )
}
