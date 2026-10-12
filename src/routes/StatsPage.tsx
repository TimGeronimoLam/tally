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
import { dayKey, diffDays, parseDayKey } from '../lib/date.ts'
import { formatNumber, formatShortDate, unitLabel } from '../lib/format.ts'
import {
  buildHeatmap,
  computeStats,
  recentDays,
  type ExerciseFilter,
} from '../stats/index.ts'

const HEATMAP_WEEKS = 26
const RANGE_OPTIONS = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
] as const
type Range = (typeof RANGE_OPTIONS)[number]['value']

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function relativeDayLabel(day: string, today: string): string {
  const back = diffDays(day, today)
  if (back === 0) return 'Today'
  if (back === 1) return 'Yesterday'
  return formatShortDate(parseDayKey(day))
}

export function StatsPage() {
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
  const heatmap = useMemo(
    () => buildHeatmap(stats.dailyTotals, { weeks: HEATMAP_WEEKS, today }),
    [stats, today],
  )
  const bars = useMemo(() => {
    const days = recentDays(stats.dailyTotals, Number(range), today)
    return days.map((d, i) => ({
      value: d.total,
      highlight: i === days.length - 1,
      label:
        range === '7'
          ? WEEKDAY_INITIALS[(parseDayKey(d.day).getDay() + 6) % 7]
          : i % 5 === 4
            ? String(parseDayKey(d.day).getDate())
            : '',
    }))
  }, [stats, range, today])

  // Unit caption: the exercise's own, or "reps" when every exercise uses reps.
  const selectedExercise = exercises.find((e) => e.id === filter)
  const unit = selectedExercise
    ? unitLabel(selectedExercise)
    : exercises.every((e) => e.unit === 'reps')
      ? 'reps'
      : 'total'

  const filterOptions = [
    { value: 'all', label: 'All' },
    ...exercises.map((e) => ({ value: e.id, label: e.name })),
  ]

  if (!entries) return null

  return (
    <Screen>
      <ScreenHeader title="Stats" meta="Last 6 months" />

      <Gutter className="pt-4">
        {filterOptions.length <= 4 ? (
          <SegmentedControl
            aria-label="Exercise"
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
            `${formatShortDate(parseDayKey(day))}: ${formatNumber(total)} ${unit}`
          }
        />
      </Gutter>

      <Gutter className="pt-3.5">
        <Card className="flex items-center justify-between px-3.5 py-3">
          <span className="text-sm font-semibold">
            {relativeDayLabel(selectedDay, today)}
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
            label="Current streak"
            value={stats.currentStreak}
            unit="days"
            emphasis
          />
          <Tile label="Longest" value={stats.longestStreak} unit="days" />
          <Tile label="This week" value={formatNumber(stats.thisWeek)} />
          <Tile label="All-time" value={formatNumber(stats.allTime)} />
          <Tile
            label="Best day"
            value={formatNumber(stats.bestDay?.total ?? 0)}
          />
          <Tile
            label="Daily avg"
            value={formatNumber(Math.round(stats.dailyAverage))}
          />
        </TileGrid>
      </Gutter>

      <Gutter className="flex flex-col gap-2.5 pt-4 pb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Per day</span>
          <SegmentedControl
            aria-label="Range"
            size="sm"
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
          />
        </div>
        <BarChart
          bars={bars}
          aria-label={`${unit} per day, last ${range} days`}
        />
      </Gutter>
    </Screen>
  )
}
