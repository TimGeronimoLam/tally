import { isBuiltin } from '../db/builtins.ts'
import { messages } from '../i18n/index.ts'
import { calibrate } from '../lib/clock.ts'
import { supabase } from '../lib/supabase.ts'
import { signInAnonymously } from '../sync/auth.ts'
import { ensureSyncOwner, sessionUser, syncNow } from '../sync/sync.ts'
import { generateInviteCode } from './codes.ts'
import {
  resolveLocalExercise,
  type ChallengeExercise,
} from './localExercise.ts'
import type {
  Challenge,
  ChallengeEdit,
  ChallengePreview,
  ChallengeSummary,
  GoalType,
  LeaderboardRow,
  NewChallengeInput,
} from './types.ts'

function client() {
  if (!supabase) throw new Error(messages().errors.needServer)
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
    if (!session) throw new Error(messages().errors.couldNotSignIn)
  }
  // Local rows may be re-keyed when the account changes, so the local
  // exercise id a challenge points at is only resolved after this. A full
  // sync (pull + push) is not needed here and would hold the UI hostage on
  // a slow connection; it is kicked off after the RPC instead. Rows that
  // belong to another email account are refused (the error says to sign
  // in with it): a silent session must not copy them.
  await withTimeout(
    ensureSyncOwner(sessionUser(session)),
    15_000,
    messages().errors.localDataNotReady,
  )
  return session.user.id
}

function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
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
const builtinOrNull = (v: unknown) => (isBuiltin(v) ? v : null)

function toChallenge(r: Raw): Challenge {
  return {
    id: str(r.id),
    name: str(r.name),
    exerciseName: str(r.exercise_name),
    unit: str(r.unit),
    exerciseBuiltin: builtinOrNull(r.exercise_builtin),
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
    exerciseBuiltin: builtinOrNull(r.exercise_builtin),
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
  const exerciseId = await resolveLocalExercise(input)
  // Retry on the (very unlikely) invite-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await client().rpc('create_challenge', {
      p_name: input.name,
      p_exercise_name: input.exerciseName,
      p_unit: input.unit,
      p_exercise_builtin: input.exerciseBuiltin,
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
    if (error.code !== '23505')
      fail(messages().errors.couldNotCreateChallenge, error)
  }
  throw new Error(messages().errors.codeCollision)
}

export async function previewChallenge(
  code: string,
): Promise<ChallengePreview | null> {
  const { data, error } = await client().rpc('preview_challenge', {
    p_code: code,
  })
  if (error) fail(messages().errors.couldNotLookUp, error)
  const rows = (data ?? []) as Raw[]
  return rows.length ? toPreview(rows[0]) : null
}

/**
 * Join by invite code. The member's local exercise that counts is found or
 * created from the challenge's exercise (see resolveLocalExercise).
 * Returns the challenge id.
 */
export async function joinChallenge(
  code: string,
  displayName: string,
  exercise: ChallengeExercise,
): Promise<string> {
  await ensureSession()
  const exerciseId = await resolveLocalExercise(exercise)
  const { data, error } = await client().rpc('join_challenge', {
    p_code: code,
    p_display_name: displayName,
    p_exercise_id: exerciseId,
  })
  if (error) fail(messages().errors.couldNotJoin, error)
  // Entries logged earlier today should count right away.
  void syncNow()
  return str(data)
}

/** Host only: close the window now. Returns the updated challenge. */
export async function endChallenge(challengeId: string): Promise<Challenge> {
  const { data, error } = await client().rpc('end_challenge', {
    p_challenge_id: challengeId,
  })
  if (error) fail(messages().errors.couldNotEnd, error)
  const ended = toChallenge((Array.isArray(data) ? data[0] : data) as Raw)
  // The window closed at the server's "now"; that is the best clock reading
  // available, so the challenge shows as ended at once.
  calibrate(ended.endsAt)
  return ended
}

/** Host only: change name, goal and window. Returns the updated challenge. */
export async function updateChallenge(
  challengeId: string,
  edit: ChallengeEdit,
): Promise<Challenge> {
  const { data, error } = await client().rpc('update_challenge', {
    p_challenge_id: challengeId,
    p_name: edit.name,
    p_goal_type: edit.goalType,
    p_goal_value: edit.goalValue,
    p_starts_at: edit.startsAt.toISOString(),
    p_ends_at: edit.endsAt.toISOString(),
  })
  if (error) fail(messages().errors.couldNotUpdate, error)
  return toChallenge((Array.isArray(data) ? data[0] : data) as Raw)
}

/** Members only (not the host): drop off the leaderboard. */
export async function leaveChallenge(challengeId: string): Promise<void> {
  const { error } = await client().rpc('leave_challenge', {
    p_challenge_id: challengeId,
  })
  if (error) fail(messages().errors.couldNotLeave, error)
}

/** Host only: remove the challenge for everyone. */
export async function deleteChallenge(challengeId: string): Promise<void> {
  const { error } = await client().rpc('delete_challenge', {
    p_challenge_id: challengeId,
  })
  if (error) fail(messages().errors.couldNotDelete, error)
}

export async function fetchMyChallenges(): Promise<ChallengeSummary[]> {
  if (!(await currentUserId())) return []
  const { data, error } = await client().rpc('my_challenges')
  if (error) fail(messages().errors.couldNotLoadChallenges, error)
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
  if (error) fail(messages().errors.couldNotLoadLeaderboard, error)
  return ((data ?? []) as Raw[]).map(toRow)
}
