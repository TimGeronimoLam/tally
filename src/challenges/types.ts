export type GoalType = 'most_reps' | 'first_to'

export const GOAL_TYPES: Array<{ value: GoalType; label: string }> = [
  { value: 'most_reps', label: 'Most reps' },
  { value: 'first_to', label: 'First to' },
]

/** A challenge as the server describes it. Timestamps are ISO strings. */
export interface Challenge {
  id: string
  name: string
  exerciseName: string
  unit: string
  goalType: GoalType
  goalValue: number | null
  startsAt: string
  endsAt: string
  inviteCode: string
  creatorId: string
}

export interface LeaderboardRow {
  userId: string
  displayName: string
  total: number
  today: number
  rank: number
}

/** `my_challenges()` row: a challenge plus how the caller is doing in it. */
export interface ChallengeSummary extends Challenge {
  /** The caller's local exercise mapped onto this challenge. */
  myExerciseId: string
  memberCount: number
  myTotal: number
  myRank: number
  leaderTotal: number
  top: LeaderboardRow[]
}

/** `preview_challenge()` row: what a join link shows before joining. */
export interface ChallengePreview {
  id: string
  name: string
  exerciseName: string
  unit: string
  goalType: GoalType
  goalValue: number | null
  startsAt: string
  endsAt: string
  memberCount: number
  isMember: boolean
}

export interface NewChallengeInput {
  name: string
  exerciseName: string
  unit: string
  goalType: GoalType
  goalValue: number | null
  startsAt: Date
  endsAt: Date
  /** The creator's local exercise that counts toward it. */
  exerciseId: string
  displayName: string
}
