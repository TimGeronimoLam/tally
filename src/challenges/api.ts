import { calibrate } from '../lib/clock.ts'
import { supabase } from '../lib/supabase.ts'
import { signInAnonymously } from '../sync/auth.ts'
import { ensureSyncOwner, syncNow } from '../sync/sync.ts'
import { generateInviteCode } from './codes.ts'
import { resolveLocalExercise } from './localExercise.ts'
import type {
  Challenge,
  ChallengePreview,
  ChallengeSummary,
  GoalType,
  LeaderboardRow,
  NewChallengeInput,
} from './types.ts'

function client() {
  if (!supabase) throw new Error('Challenges need the Tally server')
  return supabase
}

/**
 * Challenges need a user id on the server. Without a session one is created
 * silently; the UI never calls it anonymous.
 */
export async function ensureSession(): Promise<string> {
  const c = client()
  let session = (await c.auth.getSession()).data.session
  if (!session) {
    await signInAnonymously()
    session = (await c.auth.getSession()).data.session
    if (!session) throw new Error('Could not sign in')
  }
  // Local rows may be re-keyed when the account changes, so the local
  // exercise id a challenge points at is only resolved after this. A full
  // sync (pull + push) is not needed here and would hold the UI hostage on
  // a slow connection; it is kicked off after the RPC instead.
  await withTimeout(
    ensureSyncOwner(session.user.id),
    15_000,
    'Local data did not get ready in time. Please try again.',
  )
  return session.user.id
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    p.then(resolve, reject).finally(() => window.clearTimeout(timer))
  })
}

export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null
  return (await supabase.auth.getSession()).data.session?.user.id ?? null
}

/* ---------- row mapping (snake_case + numeric strings → app types) ---------- */

type Raw = Record<string, unknown>
const str = (v: unknown) => String(v ?? '')
const num = (v: unknown) => Number(v ?? 0)
const numOrNull = (v: unknown) => (v == null ? null : Number(v))

function toChallenge(r: Raw): Challenge {
  return {
    id: str(r.id),
    name: str(r.name),
    exerciseName: str(r.exercise_name),
    unit: str(r.unit),
    goalType: str(r.goal_type) as GoalType,
    goalValue: numOrNull(r.goal_value),
    startsAt: str(r.starts_at),
    endsAt: str(r.ends_at),
    inviteCode: str(r.invite_code),
    creatorId: str(r.creator_id),
  }
}

function toRow(r: Raw): LeaderboardRow {
  return {
    userId: str(r.user_id),
    displayName: str(r.display_name),
    total: num(r.total),
    today: num(r.today),
    rank: num(r.rank),
  }
}

function toSummary(r: Raw): ChallengeSummary {
  return {
    ...toChallenge(r),
    myExerciseId: str(r.my_exercise_id),
    memberCount: num(r.member_count),
    myTotal: num(r.my_total),
    myRank: num(r.my_rank),
    leaderTotal: num(r.leader_total),
    top: Array.isArray(r.top) ? (r.top as Raw[]).map(toRow) : [],
  }
}

function toPreview(r: Raw): ChallengePreview {
  return {
    id: str(r.id),
    name: str(r.name),
    exerciseName: str(r.exercise_name),
    unit: str(r.unit),
    goalType: str(r.goal_type) as GoalType,
    goalValue: numOrNull(r.goal_value),
    startsAt: str(r.starts_at),
    endsAt: str(r.ends_at),
    memberCount: num(r.member_count),
    isMember: Boolean(r.is_member),
  }
}

function fail(prefix: string, error: { message: string }): never {
  throw new Error(`${prefix}: ${error.message}`)
}

/* ---------- RPCs ---------- */

export async function createChallenge(
  input: NewChallengeInput,
): Promise<Challenge> {
  await ensureSession()
  // Resolved after ensureSession: the id must survive any re-key above.
  const exerciseId = await resolveLocalExercise(input.exerciseName, input.unit)
  // Retry on the (very unlikely) invite-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await client().rpc('create_challenge', {
      p_name: input.name,
      p_exercise_name: input.exerciseName,
      p_unit: input.unit,
      p_goal_type: input.goalType,
      p_goal_value: input.goalValue,
      p_starts_at: input.startsAt.toISOString(),
      p_ends_at: input.endsAt.toISOString(),
      p_invite_code: generateInviteCode(),
      p_display_name: input.displayName,
      p_exercise_id: exerciseId,
    })
    if (!error) {
      // Entries logged earlier today should count right away.
      void syncNow()
      return toChallenge((Array.isArray(data) ? data[0] : data) as Raw)
    }
    if (error.code !== '23505') fail('Could not create challenge', error)
  }
  throw new Error('Could not create challenge: code collision')
}

export async function previewChallenge(
  code: string,
): Promise<ChallengePreview | null> {
  const { data, error } = await client().rpc('preview_challenge', {
    p_code: code,
  })
  if (error) fail('Could not look up challenge', error)
  const rows = (data ?? []) as Raw[]
  return rows.length ? toPreview(rows[0]) : null
}

/**
 * Join by invite code. The member's local exercise that counts is found or
 * created by the challenge's exercise name. Returns the challenge id.
 */
export async function joinChallenge(
  code: string,
  displayName: string,
  exerciseName: string,
  unit: string,
): Promise<string> {
  await ensureSession()
  const exerciseId = await resolveLocalExercise(exerciseName, unit)
  const { data, error } = await client().rpc('join_challenge', {
    p_code: code,
    p_display_name: displayName,
    p_exercise_id: exerciseId,
  })
  if (error) fail('Could not join', error)
  // Entries logged earlier today should count right away.
  void syncNow()
  return str(data)
}

/** Host only: close the window now. Returns the updated challenge. */
export async function endChallenge(challengeId: string): Promise<Challenge> {
  const { data, error } = await client().rpc('end_challenge', {
    p_challenge_id: challengeId,
  })
  if (error) fail('Could not end challenge', error)
  const ended = toChallenge((Array.isArray(data) ? data[0] : data) as Raw)
  // The window closed at the server's "now"; that is the best clock reading
  // available, so the challenge shows as ended at once.
  calibrate(ended.endsAt)
  return ended
}

/** Host only: remove the challenge for everyone. */
export async function deleteChallenge(challengeId: string): Promise<void> {
  const { error } = await client().rpc('delete_challenge', {
    p_challenge_id: challengeId,
  })
  if (error) fail('Could not delete challenge', error)
}

export async function fetchMyChallenges(): Promise<ChallengeSummary[]> {
  if (!(await currentUserId())) return []
  const { data, error } = await client().rpc('my_challenges')
  if (error) fail('Could not load challenges', error)
  const rows = (data ?? []) as Raw[]
  // Every row carries the server's clock reading for this request.
  if (rows.length) calibrate(rows[0].server_now as string | undefined)
  return rows.map(toSummary)
}

export async function fetchLeaderboard(
  challengeId: string,
): Promise<LeaderboardRow[]> {
  const { data, error } = await client().rpc('challenge_leaderboard', {
    p_challenge_id: challengeId,
  })
  if (error) fail('Could not load leaderboard', error)
  return ((data ?? []) as Raw[]).map(toRow)
}
