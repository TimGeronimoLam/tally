import type { Challenge, ChallengeSummary } from './types.ts'

export type ChallengeStatus = 'upcoming' | 'active' | 'ended'

export function challengeStatus(
  c: Pick<Challenge, 'startsAt' | 'endsAt'>,
  now: number = Date.now(),
): ChallengeStatus {
  if (now < Date.parse(c.startsAt)) return 'upcoming'
  if (now >= Date.parse(c.endsAt)) return 'ended'
  return 'active'
}

/** Whole days until the end, rounded up; 0 once ended. */
export function daysLeft(
  c: Pick<Challenge, 'endsAt'>,
  now: number = Date.now(),
): number {
  const ms = Date.parse(c.endsAt) - now
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000)
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd" */
export function ordinal(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  switch (n % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

/** True when the caller has won: first_to reached, or most_reps ended in 1st. */
export function isWon(
  s: Pick<
    ChallengeSummary,
    'goalType' | 'goalValue' | 'myTotal' | 'myRank' | 'startsAt' | 'endsAt'
  >,
  now: number = Date.now(),
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

export const DURATION_OPTIONS = [
  { value: '3d', label: '3 days', days: 3 },
  { value: '1w', label: '1 week', days: 7 },
  { value: '1m', label: '1 month', days: 30 },
] as const
export type DurationValue = (typeof DURATION_OPTIONS)[number]['value']

/** End of the local day `days` from now, so a "1 week" challenge ends at midnight. */
export function endOfDayIn(days: number, now: Date = new Date()): Date {
  const d = new Date(now)
  d.setDate(d.getDate() + days)
  d.setHours(23, 59, 59, 999)
  return d
}

/** "Pushups · Most reps · 19 days left" */
export function challengeSubtitle(
  c: Pick<
    Challenge,
    'exerciseName' | 'goalType' | 'goalValue' | 'startsAt' | 'endsAt'
  >,
  opts: { memberCount?: number; now?: number } = {},
): string {
  const parts = [c.exerciseName]
  parts.push(
    c.goalType === 'first_to'
      ? `First to ${formatInt(c.goalValue ?? 0)}`
      : 'Most reps',
  )
  const status = challengeStatus(c, opts.now)
  if (status === 'ended') {
    parts.push(
      `ended ${new Date(c.endsAt).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
      })}`,
    )
  } else if (opts.memberCount !== undefined && c.goalType === 'first_to') {
    parts.push(
      `${opts.memberCount} ${opts.memberCount === 1 ? 'person' : 'people'}`,
    )
  } else {
    const d = daysLeft(c, opts.now)
    parts.push(`${d} ${d === 1 ? 'day' : 'days'} left`)
  }
  return parts.join(' · ')
}

function formatInt(n: number): string {
  return new Intl.NumberFormat().format(n)
}
