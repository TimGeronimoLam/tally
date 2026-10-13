import { useState, type FormEvent } from 'react'
import {
  DURATION_OPTIONS,
  GOAL_TYPES,
  challengeWindow,
  createChallenge,
  defaultDateRange,
  type DurationValue,
  type GoalType,
} from '../challenges/index.ts'
import { ExercisePicker } from '../components/app/index.ts'
import {
  Button,
  Screen,
  ScreenNav,
  SegmentedControl,
  TextField,
} from '../components/ui/index.ts'
import {
  useDisplayName,
  useExercises,
  useSelectedExercise,
} from '../db/index.ts'
import { useToast } from '../lib/toast.ts'
import { setDisplayName, useSession } from '../sync/index.ts'
import { useNav } from '../lib/nav.ts'

export function NewChallengePage() {
  const nav = useNav()
  const toast = useToast()
  const exercises = useExercises()
  const defaultExercise = useSelectedExercise(exercises)
  const savedName = useDisplayName()
  const { session } = useSession()

  const [exerciseId, setExerciseId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [goalType, setGoalType] = useState<GoalType>('most_reps')
  const [goalValue, setGoalValue] = useState('')
  const [duration, setDuration] = useState<DurationValue>('1w')
  const [range, setRange] = useState(defaultDateRange)
  const [displayName, setDisplayNameInput] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [monthName] = useState(() =>
    new Date().toLocaleDateString(undefined, { month: 'long' }),
  )

  if (!exercises || savedName === undefined) return null

  const exercise =
    exercises.find((e) => e.id === exerciseId) ?? defaultExercise ?? null
  const yourName = displayName ?? savedName
  const defaultTitle = exercise ? `${monthName} ${exercise.name}` : ''
  const goal = Number(goalValue)
  const timeWindow = challengeWindow(duration, range)
  const valid =
    exercise !== null &&
    yourName.trim().length > 0 &&
    (goalType === 'most_reps' || goal > 0) &&
    timeWindow !== null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || !exercise || !timeWindow || busy) return
    setBusy(true)
    try {
      if (yourName.trim() !== savedName) await setDisplayName(yourName)
      const created = await createChallenge({
        name: name.trim() || defaultTitle,
        exerciseName: exercise.name,
        unit: exercise.unit,
        goalType,
        goalValue: goalType === 'first_to' ? goal : null,
        startsAt: timeWindow.startsAt,
        endsAt: timeWindow.endsAt,
        displayName: yourName.trim(),
      })
      toast({ message: 'Challenge created. Share the code!' })
      if (!session?.user.email) {
        toast({
          message:
            'Add an email in Account to keep your challenges if you switch phones',
          queue: true,
          duration: 6000,
        })
      }
      nav.push(`/challenges/${created.id}`, { replace: true })
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : 'Could not create',
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScreenNav title="New challenge" onBack={() => nav.pop('/challenges')} />

      <form onSubmit={submit} className="flex flex-col gap-5 px-5 pt-5 pb-8">
        <Field label="Exercise">
          <ExercisePicker
            exercises={exercises}
            selectedId={exercise?.id ?? null}
            onSelect={setExerciseId}
          />
        </Field>

        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultTitle || 'e.g. October Pushups'}
          autoComplete="off"
        />

        <Field label="Goal">
          <SegmentedControl
            aria-label="Goal type"
            options={GOAL_TYPES}
            value={goalType}
            onChange={setGoalType}
          />
        </Field>

        {goalType === 'first_to' && (
          <TextField
            label={`Target (${exercise?.unit ?? 'reps'})`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 1000"
          />
        )}

        <Field label="Duration">
          <SegmentedControl
            aria-label="Duration"
            options={DURATION_OPTIONS}
            value={duration}
            onChange={setDuration}
          />
        </Field>

        {duration === 'custom' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <TextField
                label="Starts"
                type="date"
                value={range.startKey}
                max={range.endKey}
                onChange={(e) =>
                  setRange((r) => ({ ...r, startKey: e.target.value }))
                }
                className="min-w-0 flex-1"
              />
              <TextField
                label="Ends"
                type="date"
                value={range.endKey}
                min={range.startKey}
                onChange={(e) =>
                  setRange((r) => ({ ...r, endKey: e.target.value }))
                }
                className="min-w-0 flex-1"
              />
            </div>
            <p className="text-[13px] text-muted">
              {timeWindow
                ? 'Runs from the start of the first day to the end of the last.'
                : 'Pick an end date that is today or later, after the start.'}
            </p>
          </div>
        )}

        <TextField
          label="Your name on the leaderboard"
          value={yourName}
          onChange={(e) => setDisplayNameInput(e.target.value)}
          placeholder="e.g. Tim"
          autoComplete="nickname"
          maxLength={24}
        />

        <Button type="submit" size="lg" fullWidth disabled={!valid || busy}>
          {busy ? 'Creating…' : 'Create challenge'}
        </Button>
      </form>
    </Screen>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium">{label}</span>
      {children}
    </div>
  )
}
