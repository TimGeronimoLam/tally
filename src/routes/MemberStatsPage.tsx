import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import {
  challengeDaysSoFar,
  challengeStatus,
  useChallengeSummary,
  useLeaderboard,
  useMemberDays,
} from '../challenges/index.ts'
import {
  Card,
  Gutter,
  Heatmap,
  Screen,
  ScreenNav,
  Tile,
  TileGrid,
} from '../components/ui/index.ts'
import { useLocale, useT } from '../i18n/index.ts'
import { parseDayKey } from '../lib/date.ts'
import {
  formatDayMonth,
  formatNumber,
  formatRelativeDay,
  formatShortDate,
  unitName,
} from '../lib/format.ts'
import { useNav } from '../lib/nav.ts'
import { buildHeatmap, statsFromDailyTotals } from '../stats/index.ts'

/**
 * One member's stats in a challenge: the challenge's exercise, inside its
 * window, day by day. Opened from a leaderboard row; works for the viewer
 * too.
 */
export function MemberStatsPage() {
  const t = useT()
  const locale = useLocale()
  const { id, userId: memberId } = useParams()
  const nav = useNav()
  const { data: c, missing, loading, userId, refresh } = useChallengeSummary(id)
  const board = useLeaderboard(c?.id)
  const days = useMemberDays(c?.id, memberId)
  const [picked, setPicked] = useState<string | null>(null)

  const span = c ? challengeDaysSoFar(c) : null
  const dailyTotals = useMemo(
    () => new Map((days.data ?? []).map((d) => [d.day, d.total])),
    [days.data],
  )
  const stats = useMemo(
    () => statsFromDailyTotals(dailyTotals, span?.last),
    [dailyTotals, span?.last],
  )
  // `locale` is not read here, but the month labels inside follow it.
  const heatmap = useMemo(
    () =>
      span &&
      buildHeatmap(dailyTotals, {
        weeks: 1,
        since: span.first,
        from: span.first,
        today: span.last,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dailyTotals, span?.first, span?.last, locale],
  )

  const rows = board.data ?? c?.top ?? []
  const member = rows.find((r) => r.userId === memberId)
  const back = () => nav.pop(`/challenges/${id}`)
  const pullRefresh = userId
    ? () => Promise.all([refresh(), board.refresh(), days.refresh()])
    : undefined

  // The challenge is gone from the list, or the member left it.
  const gone = missing || (board.data !== undefined && !member)
  if (gone || !c || !member || !span || !heatmap) {
    const notice = missing
      ? t.challengeDetail.notOnList
      : gone
        ? t.memberStats.notInChallenge
        : loading || board.loading
          ? t.common.loading
          : board.error
    return (
      <Screen onRefresh={pullRefresh}>
        <ScreenNav
          title={t.memberStats.title}
          backLabel={t.memberStats.backLabel}
          onBack={back}
        />
        {notice && (
          <Gutter className="pt-4 text-[15px] text-muted">{notice}</Gutter>
        )}
      </Screen>
    )
  }

  const status = challengeStatus(c)
  const unit = unitName(c.unit, t)
  const selectedDay = picked ?? span.last
  // Until the first load, tiles show a dash rather than zeros.
  const value = (n: number) => (days.data ? formatNumber(n) : '—')

  return (
    <Screen onRefresh={pullRefresh}>
      <ScreenNav
        title={member.displayName}
        backLabel={t.memberStats.backLabel}
        onBack={back}
      >
        <span className="text-sm text-muted">
          {status === 'upcoming'
            ? c.name
            : `${t.challenges.placing(t.ordinal(member.rank), rows.length)} · ${c.name}`}
        </span>
      </ScreenNav>

      {status === 'upcoming' ? (
        <Gutter className="pt-4 text-[15px] text-muted">
          {t.memberStats.startsOn(formatDayMonth(c.startsAt))}
        </Gutter>
      ) : (
        <>
          <Gutter className="pt-4">
            <Heatmap
              data={heatmap}
              selectedDay={selectedDay}
              onSelect={setPicked}
              cellLabel={(day, total) =>
                t.stats.cellLabel(
                  formatShortDate(parseDayKey(day)),
                  formatNumber(total),
                  unit,
                )
              }
            />
          </Gutter>

          <Gutter className="pt-3.5">
            <Card className="flex items-center justify-between px-3.5 py-3">
              <span className="text-sm font-semibold">
                {formatRelativeDay(selectedDay, undefined, t)}
              </span>
              <span className="text-[20px] font-semibold tracking-[-0.02em]">
                {value(dailyTotals.get(selectedDay) ?? 0)}
                <span className="ml-1 text-[13px] font-medium text-muted">
                  {unit}
                </span>
              </span>
            </Card>
          </Gutter>

          <Gutter className="pt-3.5 pb-6">
            <TileGrid>
              <Tile
                label={t.memberStats.total(unit)}
                value={formatNumber(member.total)}
                emphasis
              />
              <Tile
                label={t.stats.bestDay}
                value={value(stats.bestDay?.total ?? 0)}
              />
              <Tile
                label={t.stats.dailyAvg}
                value={value(Math.round(stats.dailyAverage))}
              />
              <Tile
                label={
                  status === 'ended'
                    ? t.memberStats.finalStreak
                    : t.stats.currentStreak
                }
                value={value(stats.currentStreak)}
                unit={t.stats.days}
              />
              <Tile
                label={t.stats.longest}
                value={value(stats.longestStreak)}
                unit={t.stats.days}
              />
              <Tile
                label={t.memberStats.activeDays}
                value={value(stats.activeDays)}
                unit={t.memberStats.ofDays(span.count)}
              />
            </TileGrid>
            {days.error && (
              <p className="pt-3 text-xs text-danger">{days.error}</p>
            )}
          </Gutter>
        </>
      )}
    </Screen>
  )
}
