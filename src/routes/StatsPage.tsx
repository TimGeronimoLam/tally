import { useMemo, useState } from 'react'
import {
  BarChart,
  Card,
  Chip,
  ChipRow,
  Gutter,
  Heatmap,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Tile,
  TileGrid,
} from '../components/ui/index.ts'
import { useAllEntries, useExercises } from '../db/index.ts'
import { useLocale, useT } from '../i18n/index.ts'
import { dayKey, diffDays, parseDayKey } from '../lib/date.ts'
import {
  formatNumber,
  formatShortDate,
  unitLabel,
  unitName,
  weekdayNames,
} from '../lib/format.ts'
import {
  buildHeatmap,
  computeStats,
  recentDays,
  type ExerciseFilter,
} from '../stats/index.ts'

const HEATMAP_WEEKS = 13
const RANGES = [7, 30] as const
type Range = `${(typeof RANGES)[number]}`

export function StatsPage() {
  const t = useT()
  const locale = useLocale()
  const exercises = useExercises() ?? []
  const entries = useAllEntries()
  const [filter, setFilter] = useState<ExerciseFilter>('all')
  const [range, setRange] = useState<Range>('7')
  const today = dayKey()
  const [selectedDay, setSelectedDay] = useState(today)

  const stats = useMemo(
    () => computeStats(entries ?? [], { exerciseId: filter, today }),
    [entries, filter, today],
  )
  // `locale` is not read here, but the month labels inside follow it.
  const heatmap = useMemo(
    () => buildHeatmap(stats.dailyTotals, { weeks: HEATMAP_WEEKS, today }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stats, today, locale],
  )
  const bars = useMemo(() => {
    const initials = weekdayNames('narrow')
    const days = recentDays(stats.dailyTotals, Number(range), today)
    return days.map((d, i) => ({
      value: d.total,
      highlight: i === days.length - 1,
      label:
        range === '7'
          ? initials[(parseDayKey(d.day).getDay() + 6) % 7]
          : i % 5 === 4
            ? String(parseDayKey(d.day).getDate())
            : '',
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, range, today, locale])

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
  const rangeOptions = RANGES.map((n) => ({
    value: String(n) as Range,
    label: t.stats.rangeDays(n),
  }))

  if (!entries) return null

  return (
    <Screen>
      <ScreenHeader title={t.stats.title} meta={t.stats.meta} />

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
          <span className="text-sm font-semibold">{t.stats.perDay}</span>
          <SegmentedControl
            aria-label={t.stats.range}
            size="sm"
            options={rangeOptions}
            value={range}
            onChange={setRange}
          />
        </div>
        <BarChart
          bars={bars}
          aria-label={t.stats.perDayChart(unit, Number(range))}
        />
      </Gutter>
    </Screen>
  )
}
