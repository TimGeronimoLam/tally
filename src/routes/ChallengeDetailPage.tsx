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
  leaveChallenge,
  useChallengeSummary,
  useLeaderboard,
} from '../challenges/index.ts'
import { InviteCodeCard, LeaderboardList } from '../components/app/index.ts'
import {
  Button,
  ButtonLink,
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
import { useT } from '../i18n/index.ts'
import { formatDayMonth, formatNumber, unitName } from '../lib/format.ts'
import { shareLink } from '../lib/share.ts'
import { useToast } from '../lib/toast.ts'
import { useNav } from '../lib/nav.ts'

function windowLabel(startsAt: string, endsAt: string): string {
  return `${formatDayMonth(startsAt)} – ${formatDayMonth(endsAt)}`
}

export function ChallengeDetailPage() {
  const t = useT()
  const { id } = useParams()
  const nav = useNav()
  const toast = useToast()
  const { data: c, missing, loading, userId, refresh } = useChallengeSummary(id)
  const board = useLeaderboard(c?.id)
  const [confirm, setConfirm] = useState<'end' | 'delete' | 'leave' | null>(
    null,
  )
  const [busy, setBusy] = useState(false)

  if (missing) {
    return (
      <Screen>
        <ScreenNav
          title={t.challengeDetail.title}
          backLabel={t.challengeDetail.backLabel}
          onBack={() => nav.pop('/challenges')}
        />
        <Gutter className="pt-4 text-[15px] text-muted">
          {t.challengeDetail.notOnList}
        </Gutter>
      </Screen>
    )
  }
  if (!c) {
    return (
      <Screen>
        <ScreenNav
          title={t.challengeDetail.title}
          backLabel={t.challengeDetail.backLabel}
          onBack={() => nav.pop('/challenges')}
        />
        {loading && (
          <Gutter className="pt-4 text-[15px] text-muted">
            {t.common.loading}
          </Gutter>
        )}
      </Screen>
    )
  }

  const status = challengeStatus(c)
  const rows = board.data ?? c.top
  const unit = unitName(c.unit, t)
  const isHost = userId !== null && c.creatorId === userId

  async function share() {
    const outcome = await shareLink({
      title: t.challengeDetail.shareTitle(c!.name),
      text: t.challengeDetail.shareText(c!.name, c!.inviteCode),
      url: inviteUrl(c!.inviteCode),
    })
    if (outcome === 'copied') toast({ message: t.challengeDetail.linkCopied })
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
      toast({ message: t.challengeDetail.endedToast })
    } catch (err) {
      toast({
        message:
          err instanceof Error ? err.message : t.challengeDetail.couldNotEnd,
      })
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
      toast({ message: t.challengeDetail.deletedToast })
      nav.pop('/challenges', { replace: true })
    } catch (err) {
      toast({
        message:
          err instanceof Error ? err.message : t.challengeDetail.couldNotDelete,
      })
    } finally {
      setBusy(false)
    }
  }

  async function leave() {
    if (busy) return
    setBusy(true)
    try {
      await leaveChallenge(c!.id)
      await refresh()
      setConfirm(null)
      toast({ message: t.challengeDetail.leftToast })
      nav.pop('/challenges', { replace: true })
    } catch (err) {
      toast({
        message:
          err instanceof Error ? err.message : t.challengeDetail.couldNotLeave,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScreenNav
        backLabel={t.challengeDetail.backLabel}
        onBack={() => nav.pop('/challenges')}
        action={
          <IconButton aria-label={t.challengeDetail.share} onClick={share}>
            <ShareIcon />
          </IconButton>
        }
        title={c.name}
      >
        <span className="text-sm text-muted">
          {c.exerciseName} ·{' '}
          {c.goalType === 'first_to'
            ? t.challengeDetail.firstToWins(formatNumber(c.goalValue ?? 0))
            : t.challengeDetail.mostRepsWins}{' '}
          · {windowLabel(c.startsAt, c.endsAt)}
        </span>
      </ScreenNav>

      <Gutter className="pt-5">
        <TileGrid>
          {status === 'ended' ? (
            <Tile label={t.challengeDetail.ended} value="—" />
          ) : status === 'upcoming' ? (
            <Tile
              label={t.challengeDetail.startsIn}
              value={daysUntilStart(c)}
            />
          ) : (
            <Tile label={t.challengeDetail.daysLeft} value={daysLeft(c)} />
          )}
          <Tile
            label={t.challengeDetail.yourUnit(unit)}
            value={formatNumber(c.myTotal)}
          />
          {c.goalType === 'first_to' ? (
            <Tile
              label={t.challengeDetail.toGoal}
              value={formatNumber(Math.max(0, (c.goalValue ?? 0) - c.myTotal))}
              emphasis
            />
          ) : (
            <Tile
              label={
                c.myRank === 1
                  ? t.challengeDetail.lead
                  : t.challengeDetail.toFirst
              }
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
          <SectionLabel className="pt-0 pb-0">
            {t.challengeDetail.leaderboard}
          </SectionLabel>
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
          <SectionLabel>{t.challengeDetail.host}</SectionLabel>
          <div className="flex flex-col gap-2 pt-1">
            {status !== 'ended' && (
              <ButtonLink
                to={`/challenges/${c.id}/edit`}
                variant="outline"
                fullWidth
              >
                {t.challengeDetail.editChallenge}
              </ButtonLink>
            )}
            {status === 'active' && (
              <Button
                variant="outline"
                fullWidth
                onClick={() => setConfirm('end')}
              >
                {t.challengeDetail.endNow}
              </Button>
            )}
            <Button
              variant="danger"
              fullWidth
              onClick={() => setConfirm('delete')}
            >
              {t.challengeDetail.deleteChallenge}
            </Button>
          </div>
        </Gutter>
      )}

      {userId !== null && !isHost && (
        <Gutter className="pt-5">
          <Button
            variant="danger"
            fullWidth
            onClick={() => setConfirm('leave')}
          >
            {t.challengeDetail.leaveChallenge}
          </Button>
        </Gutter>
      )}

      <div className="flex-1" />

      {status !== 'ended' && (
        <Gutter className="pt-6 pb-5">
          <Button size="lg" fullWidth onClick={logThis}>
            {t.challengeDetail.logExercise(c.exerciseName)}
          </Button>
        </Gutter>
      )}

      <ConfirmSheet
        open={confirm === 'end'}
        title={t.challengeDetail.endTitle}
        message={t.challengeDetail.endMessage(c.name)}
        confirmLabel={
          busy ? t.challengeDetail.ending : t.challengeDetail.endConfirm
        }
        onConfirm={endNow}
        onClose={() => !busy && setConfirm(null)}
      />
      <ConfirmSheet
        open={confirm === 'delete'}
        title={t.challengeDetail.deleteTitle}
        message={t.challengeDetail.deleteMessage(c.name, c.memberCount)}
        confirmLabel={
          busy ? t.challengeDetail.deleting : t.challengeDetail.deleteChallenge
        }
        destructive
        onConfirm={remove}
        onClose={() => !busy && setConfirm(null)}
      />
      <ConfirmSheet
        open={confirm === 'leave'}
        title={t.challengeDetail.leaveTitle}
        message={t.challengeDetail.leaveMessage(c.name, c.inviteCode)}
        confirmLabel={
          busy ? t.challengeDetail.leaving : t.challengeDetail.leaveChallenge
        }
        destructive
        onConfirm={leave}
        onClose={() => !busy && setConfirm(null)}
      />
    </Screen>
  )
}
