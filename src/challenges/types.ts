import type { BuiltinExercise } from '../db/builtins.ts'

/**
 * most_reps: highest total at the end wins. first_to: first member to reach
 * goalValue wins. team: all members together reach goalValue in the window.
 */
export type GoalType = 'most_reps' | 'first_to' | 'team'

/** Picker order; labels come from `m.challenges.goalType[value]`. */
export const GOAL_TYPES: GoalType[] = ['most_reps', 'first_to', 'team']

/** A challenge as the server describes it. Timestamps are ISO strings. */
export interface Challenge {
  id: string
  name: string
  /** As the host named it. Show `challengeExerciseName`, which localizes a built-in. */
  exerciseName: string
  unit: string
  /** Set when the exercise is a built-in; members match on it, not the name. */
  exerciseBuiltin: BuiltinExercise | null
  goalType: GoalType
  goalValue: number | null
  startsAt: string
  endsAt: string
  inviteCode: string
  creatorId: string
  /** Listed under Challenges for everyone to join. */
  isPublic: boolean
}

export interface LeaderboardRow {
  userId: string
  displayName: string
  /**
   * When the member last uploaded a profile picture (see `avatarUrl`);
   * null or missing (older cached rows) means none.
   */
  avatarUpdatedAt?: string | null
  total: number
  today: number
  rank: number
}

/** One member's total for one day of a challenge, in the viewer's time zone. */
export interface MemberDay {
  /** Day key, `YYYY-MM-DD`. */
  day: string
  total: number
}

/** `my_challenges()` row: a challenge plus how the caller is doing in it. */
export interface ChallengeSummary extends Challenge {
  /** The caller's local exercise mapped onto this challenge. */
  myExerciseId: string
  memberCount: number
  myTotal: number
  myRank: number
  leaderTotal: number
  /** All members' totals summed; what a team goal is measured against. */
  teamTotal: number
  top: LeaderboardRow[]
}

/** `preview_challenge()` row: what a join link shows before joining. */
export interface ChallengePreview {
  id: string
  name: string
  exerciseName: string
  unit: string
  exerciseBuiltin: BuiltinExercise | null
  goalType: GoalType
  goalValue: number | null
  startsAt: string
  endsAt: string
  memberCount: number
  isMember: boolean
}

/** `public_challenges()` row: a listed challenge the caller is not in. */
export interface PublicChallenge extends Omit<ChallengePreview, 'isMember'> {
  inviteCode: string
}

export interface NewChallengeInput {
  name: string
  exerciseName: string
  unit: string
  exerciseBuiltin: BuiltinExercise | null
  goalType: GoalType
  goalValue: number | null
  startsAt: Date
  endsAt: Date
  displayName: string
  isPublic: boolean
}

/** What the host can change after creating. The exercise stays fixed. */
export interface ChallengeEdit {
  name: string
  goalType: GoalType
  goalValue: number | null
  startsAt: Date
  endsAt: Date
  isPublic: boolean
}
