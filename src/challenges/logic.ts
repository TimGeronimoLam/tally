import type { Messages } from '../i18n/index.ts'
import { serverNow } from '../lib/clock.ts'
import { dayKey, parseDayKey, shiftDayKey, startOfDay } from '../lib/date.ts'
import { formatDayMonth, formatNumber } from '../lib/format.ts'
import type { Challenge, ChallengeSummary } from './types.ts'

export type ChallengeStatus = 'upcoming' | 'active' | 'ended'

export function challengeStatus(
  c: Pick<Challenge, 'startsAt' | 'endsAt'>,
  now: number = serverNow(),
): ChallengeStatus {
  if (now < Date.parse(c.startsAt)) return 'upcoming'
  if (now >= Date.parse(c.endsAt)) return 'ended'
  return 'active'
}

/** Whole days until the start, rounded up; 0 once started. */
export function daysUntilStart(
  c: Pick<Challenge, 'startsAt'>,
  now: number = serverNow(),
): number {
  const ms = Date.parse(c.startsAt) - now
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

/** Whole days until the end, rounded up; 0 once ended. */
export function daysLeft(
  c: Pick<Challenge, 'endsAt'>,
  now: number = serverNow(),
): number {
  const ms = Date.parse(c.endsAt) - now
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

/** True when the caller has won: first_to reached, or most_reps ended in 1st. */
export function isWon(
  s: Pick<
    ChallengeSummary,
    'goalType' | 'goalValue' | 'myTotal' | 'myRank' | 'startsAt' | 'endsAt'
  >,
  now: number = serverNow(),
): boolean {
  if (s.goalType === 'first_to') {
    return s.goalValue !== null && s.myTotal >= s.goalValue && s.myRank === 1
  }
  return challengeStatus(s, now) === 'ended' && s.myRank === 1
}

/** Amount still needed to pass the leader, or 0 when leading. */
export function gapToFirst(
  s: Pick<ChallengeSummary, 'myTotal' | 'leaderTotal' | 'myRank'>,
): number {
  if (s.myRank === 1) return 0
  return Math.max(0, s.leaderTotal - s.myTotal + 1)
}

/** Duration presets; labels come from `m.newChallenge.durations[value]`. */
export const DURATION_OPTIONS = [
  { value: '3d', days: 3 },
  { value: '1w', days: 7 },
  { value: '1m', days: 30 },
  { value: 'custom', days: null },
] as const
export type DurationValue = (typeof DURATION_OPTIONS)[number]['value']

/** End of the local day `days` from now, so a "1 week" challenge ends at midnight. */
export function endOfDayIn(days: number, now: Date = new Date()): Date {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  d.setHours(23, 59, 59, 999)
  return d
}

/** Local day keys (`YYYY-MM-DD`) picked in the custom date fields. */
export interface DateRangeInput {
  startKey: string
  endKey: string
}

/** Default custom range: today through a week from today. */
export function defaultDateRange(now: Date = new Date()): DateRangeInput {
  const startKey = dayKey(now)
  return { startKey, endKey: shiftDayKey(startKey, 7) }
}

/**
 * Turn a preset or custom range into the challenge window: local midnight
 * at the start of the first day through the last moment of the last day.
 * Returns null when the range is unusable.
 */
export function challengeWindow(
  duration: DurationValue,
  range: DateRangeInput,
  now: Date = new Date(),
): { startsAt: Date; endsAt: Date } | null {
  const preset = DURATION_OPTIONS.find((d) => d.value === duration)
  if (!preset) return null
  if (preset.days !== null) {
    return {
      // From the start of today, so reps logged earlier today already count.
      startsAt: new Date(startOfDay(now)),
      endsAt: endOfDayIn(preset.days, now),
    }
  }
  if (!isDayKey(range.startKey) || !isDayKey(range.endKey)) return null
  const startsAt = parseDayKey(range.startKey)
  const endsAt = endOfDayIn(0, parseDayKey(range.endKey))
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()))
    return null
  if (endsAt <= startsAt) return null
  // No point creating a challenge that is already over.
  if (endsAt.getTime() <= now.getTime()) return null
  return { startsAt, endsAt }
}

/** The date fields for an existing challenge: its first and last local day. */
export function dateRangeOf(
  c: Pick<Challenge, 'startsAt' | 'endsAt'>,
): DateRangeInput {
  return {
    startKey: dayKey(new Date(c.startsAt)),
    endKey: dayKey(new Date(c.endsAt)),
  }
}

/**
 * The window after the host edits the date fields. A day left as it was
 * keeps its exact timestamp, so saving only a new name never moves the
 * window. A changed day snaps to local midnight (start) or the last moment
 * of the day (end), like a new custom range. Null when the range is
 * unusable; it must still end in the future, as the server checks.
 */
export function editedWindow(
  c: Pick<Challenge, 'startsAt' | 'endsAt'>,
  range: DateRangeInput,
  now: number = serverNow(),
): { startsAt: Date; endsAt: Date } | null {
  if (!isDayKey(range.startKey) || !isDayKey(range.endKey)) return null
  const before = dateRangeOf(c)
  const startsAt =
    range.startKey === before.startKey
      ? new Date(c.startsAt)
      : parseDayKey(range.startKey)
  const endsAt =
    range.endKey === before.endKey
      ? new Date(c.endsAt)
      : endOfDayIn(0, parseDayKey(range.endKey))
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()))
    return null
  if (endsAt <= startsAt) return null
  if (endsAt.getTime() <= now) return null
  return { startsAt, endsAt }
}

function isDayKey(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/** "Pushups · Most reps · 19 days left", in the language of `m`. */
export function challengeSubtitle(
  c: Pick<
    Challenge,
    'exerciseName' | 'goalType' | 'goalValue' | 'startsAt' | 'endsAt'
  >,
  m: Messages,
  opts: { memberCount?: number; now?: number } = {},
): string {
  const s = m.challenges.subtitle
  const parts = [c.exerciseName]
  parts.push(
    c.goalType === 'first_to'
      ? s.firstTo(formatNumber(c.goalValue ?? 0))
      : s.mostReps,
  )
  const status = challengeStatus(c, opts.now)
  if (status === 'ended') {
    parts.push(s.ended(formatDayMonth(c.endsAt)))
  } else if (status === 'upcoming') {
    parts.push(s.starts(formatDayMonth(c.startsAt)))
  } else if (opts.memberCount !== undefined && c.goalType === 'first_to') {
    parts.push(s.people(opts.memberCount))
  } else {
    parts.push(s.daysLeft(daysLeft(c, opts.now)))
  }
  return parts.join(' · ')
}
