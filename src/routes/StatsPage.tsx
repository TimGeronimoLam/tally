import { useMemo, useRef, useState } from 'react'
import {
  BarChart,
  Card,
  ChevronLeftIcon,
  ChevronRightIcon,
  Chip,
  ChipRow,
  Gutter,
  Heatmap,
  IconButton,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Tile,
  TileGrid,
} from '../components/ui/index.ts'
import { useAllEntries, useExercises } from '../db/index.ts'
import { useLocale, useT } from '../i18n/index.ts'
import {
  dayKey,
  diffDays,
  parseDayKey,
  weekdayMondayFirst,
} from '../lib/date.ts'
import { haptic } from '../lib/haptics.ts'
import {
  formatDayRange,
  formatMonthRange,
  formatMonthShort,
  formatMonthYear,
  formatNumber,
  formatShortDate,
  unitLabel,
  unitName,
  weekdayNames,
} from '../lib/format.ts'
import {
  buildHeatmap,
  CHART_RANGES,
  chartPeriod,
  computeStats,
  maxChartOffset,
  type ChartRange,
  type ExerciseFilter,
} from '../stats/index.ts'

/** Shortest heatmap; it grows back to the first entry beyond this. */
const HEATMAP_WEEKS = 13
/** Horizontal travel, in px, that turns a touch on the chart into a page turn. */
const SWIPE_MIN = 40
/** The chart's last range (7d / 30d / 1y), kept across visits on this device. */
const RANGE_KEY = 'tally.statsRange'

function readRange(): ChartRange {
  try {
    const v = localStorage.getItem(RANGE_KEY)
    if (CHART_RANGES.includes(v as ChartRange)) return v as ChartRange
  } catch {
    // storage unavailable (private mode etc.)
  }
  return '7d'
}

function saveRange(range: ChartRange) {
  try {
    localStorage.setItem(RANGE_KEY, range)
  } catch {
    // ignore
  }
}

export function StatsPage() {
  const t = useT()
  const locale = useLocale()
  const exercises = useExercises() ?? []
  const entries = useAllEntries()
  const [filter, setFilter] = useState<ExerciseFilter>('all')
  const [range, setRange] = useState(readRange)
  const [offset, setOffset] = useState(0)
  const today = dayKey()
  const [selectedDay, setSelectedDay] = useState(today)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const stats = useMemo(
    () => computeStats(entries ?? [], { exerciseId: filter, today }),
    [entries, filter, today],
  )
  // `locale` is not read here, but the month labels inside follow it.
  const heatmap = useMemo(
    () =>
      buildHeatmap(stats.dailyTotals, {
        weeks: HEATMAP_WEEKS,
        since: stats.firstDay,
        today,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats, today, locale],
  )

  // Switching exercise can leave fewer pages than the one being viewed.
  const maxOffset = maxChartOffset(stats.firstDay, range, today)
  const page = Math.min(offset, maxOffset)
  const period = useMemo(
    () => chartPeriod(stats.dailyTotals, range, page, today),
    [stats, range, page, today],
  )
  const bars = useMemo(() => {
    const initials = weekdayNames('narrow')
    const last = period.buckets.length - 1
    return period.buckets.map((b, i) => ({
      value: b.total,
      highlight: page === 0 && i === last,
      label:
        range === '7d'
          ? initials[weekdayMondayFirst(b.day)]
          : range === '1y'
            ? formatMonthShort(parseDayKey(b.day))
            : i % 5 === 4
              ? String(parseDayKey(b.day).getDate())
              : '',
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, page, range, locale])
  const periodLabel =
    range === '1y'
      ? formatMonthRange(parseDayKey(period.start), parseDayKey(period.end))
      : formatDayRange(parseDayKey(period.start), parseDayKey(period.end))

  function turnPage(to: number) {
    if (to < 0 || to > maxOffset || to === page) return
    haptic('tap')
    setOffset(to)
  }

  function relativeDayLabel(day: string): string {
    const back = diffDays(day, today)
    if (back === 0) return t.stats.today
    if (back === 1) return t.stats.yesterday
    return formatShortDate(parseDayKey(day))
  }

  // Unit caption: the exercise's own, or "reps" when every exercise uses reps.
  const selectedExercise = exercises.find((e) => e.id === filter)
  const unit = selectedExercise
    ? unitLabel(selectedExercise, t)
    : exercises.every((e) => e.unit === 'reps')
      ? unitName('reps', t)
      : t.stats.total

  const filterOptions = [
    { value: 'all', label: t.stats.all },
    ...exercises.map((e) => ({ value: e.id, label: e.name })),
  ]
  const rangeOptions = CHART_RANGES.map((r) => ({
    value: r,
    label: r === '1y' ? t.stats.rangeYear : t.stats.rangeDays(parseInt(r)),
  }))

  if (!entries) return null

  return (
    <Screen>
      <ScreenHeader
        title={t.stats.title}
        meta={
          stats.firstDay &&
          t.stats.since(formatMonthYear(parseDayKey(stats.firstDay)))
        }
      />

      <Gutter className="pt-4">
        {filterOptions.length <= 4 ? (
          <SegmentedControl
            aria-label={t.stats.exercise}
            options={filterOptions}
            value={filter}
            onChange={setFilter}
          />
        ) : (
          <ChipRow>
            {filterOptions.map((o) => (
              <Chip
                key={o.value}
                size="sm"
                selected={o.value === filter}
                onClick={() => setFilter(o.value)}
              >
                {o.label}
              </Chip>
            ))}
          </ChipRow>
        )}
      </Gutter>

      <Gutter className="pt-4">
        <Heatmap
          data={heatmap}
          selectedDay={selectedDay}
          onSelect={setSelectedDay}
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
            {relativeDayLabel(selectedDay)}
          </span>
          <span className="text-[20px] font-semibold tracking-[-0.02em]">
            {formatNumber(stats.dailyTotals.get(selectedDay) ?? 0)}
            <span className="ml-1 text-[13px] font-medium text-muted">
              {unit}
            </span>
          </span>
        </Card>
      </Gutter>

      <Gutter className="pt-3.5">
        <TileGrid>
          <Tile
            label={t.stats.currentStreak}
            value={stats.currentStreak}
            unit={t.stats.days}
            emphasis
          />
          <Tile
            label={t.stats.longest}
            value={stats.longestStreak}
            unit={t.stats.days}
          />
          <Tile label={t.stats.thisWeek} value={formatNumber(stats.thisWeek)} />
          <Tile label={t.stats.allTime} value={formatNumber(stats.allTime)} />
          <Tile
            label={t.stats.bestDay}
            value={formatNumber(stats.bestDay?.total ?? 0)}
          />
          <Tile
            label={t.stats.dailyAvg}
            value={formatNumber(Math.round(stats.dailyAverage))}
          />
        </TileGrid>
      </Gutter>

      <Gutter className="flex flex-col gap-2.5 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">
            {range === '1y' ? t.stats.perMonth : t.stats.perDay}
          </span>
          <SegmentedControl
            aria-label={t.stats.range}
            size="sm"
            options={rangeOptions}
            value={range}
            onChange={(r) => {
              setRange(r)
              setOffset(0)
              saveRange(r)
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] text-muted">{periodLabel}</span>
            <span className="text-[20px] font-semibold tracking-[-0.02em]">
              {formatNumber(period.total)}
              <span className="ml-1 text-[13px] font-medium text-muted">
                {unit}
              </span>
            </span>
          </div>
          <div className="-mr-2.5 flex shrink-0">
            <IconButton
              aria-label={t.stats.earlier}
              disabled={page >= maxOffset}
              onClick={() => turnPage(page + 1)}
              className="disabled:text-disabled"
            >
              <ChevronLeftIcon size={20} />
            </IconButton>
            <IconButton
              aria-label={t.stats.later}
              disabled={page === 0}
              onClick={() => turnPage(page - 1)}
              className="disabled:text-disabled"
            >
              <ChevronRightIcon size={20} />
            </IconButton>
          </div>
        </div>
        {/* Swipe right for earlier, left for later, like the heatmap scrolls. */}
        <div
          onTouchStart={(e) => {
            const p = e.touches[0]
            swipeStart.current = { x: p.clientX, y: p.clientY }
          }}
          onTouchEnd={(e) => {
            const start = swipeStart.current
            swipeStart.current = null
            if (!start) return
            const p = e.changedTouches[0]
            const dx = p.clientX - start.x
            const dy = p.clientY - start.y
            if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < 2 * Math.abs(dy))
              return
            turnPage(dx > 0 ? page + 1 : page - 1)
          }}
        >
          <BarChart
            bars={bars}
            aria-label={
              range === '1y'
                ? t.stats.perMonthChart(unit, periodLabel)
                : t.stats.perDayChart(unit, periodLabel)
            }
          />
        </div>
      </Gutter>
    </Screen>
  )
}
