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
import { DateRangeFields, ExercisePicker } from '../components/app/index.ts'
import {
  Button,
  Field,
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
import { useT } from '../i18n/index.ts'
import { formatMonthName, unitName } from '../lib/format.ts'
import { useToast } from '../lib/toast.ts'
import { setDisplayName, useSession } from '../sync/index.ts'
import { useNav } from '../lib/nav.ts'

export function NewChallengePage() {
  const t = useT()
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

  if (!exercises || savedName === undefined) return null

  const exercise =
    exercises.find((e) => e.id === exerciseId) ?? defaultExercise ?? null
  const yourName = displayName ?? savedName
  const defaultTitle = exercise
    ? t.newChallenge.defaultTitle(formatMonthName(), exercise.name)
    : ''
  const goal = Number(goalValue)
  const timeWindow = challengeWindow(duration, range)
  const valid =
    exercise !== null &&
    yourName.trim().length > 0 &&
    (goalType === 'most_reps' || goal > 0) &&
    timeWindow !== null

  const goalOptions = GOAL_TYPES.map((value) => ({
    value,
    label: t.challenges.goalType[value],
  }))
  const durationOptions = DURATION_OPTIONS.map(({ value }) => ({
    value,
    label: t.newChallenge.durations[value],
  }))

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
      toast({ message: t.newChallenge.createdToast })
      if (!session?.user.email) {
        toast({
          message: t.newChallenge.keepChallengesHint,
          queue: true,
          duration: 6000,
        })
      }
      nav.push(`/challenges/${created.id}`, { replace: true })
    } catch (err) {
      toast({
        message:
          err instanceof Error ? err.message : t.newChallenge.couldNotCreate,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScreenNav
        title={t.newChallenge.title}
        onBack={() => nav.pop('/challenges')}
      />

      <form onSubmit={submit} className="flex flex-col gap-5 px-5 pt-5 pb-8">
        <Field label={t.newChallenge.exercise}>
          <ExercisePicker
            exercises={exercises}
            selectedId={exercise?.id ?? null}
            onSelect={setExerciseId}
          />
        </Field>

        <TextField
          label={t.newChallenge.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={defaultTitle || t.newChallenge.namePlaceholder}
          autoComplete="off"
        />

        <Field label={t.newChallenge.goal}>
          <SegmentedControl
            aria-label={t.newChallenge.goalType}
            options={goalOptions}
            value={goalType}
            onChange={setGoalType}
          />
        </Field>

        {goalType === 'first_to' && (
          <TextField
            label={t.newChallenge.target(unitName(exercise?.unit ?? 'reps', t))}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value.replace(/\D/g, ''))}
            placeholder={t.newChallenge.targetPlaceholder}
          />
        )}

        <Field label={t.newChallenge.duration}>
          <SegmentedControl
            aria-label={t.newChallenge.duration}
            options={durationOptions}
            value={duration}
            onChange={setDuration}
          />
        </Field>

        {duration === 'custom' && (
          <DateRangeFields
            range={range}
            onChange={setRange}
            hint={
              timeWindow
                ? t.newChallenge.customHint
                : t.newChallenge.customInvalid
            }
          />
        )}

        <TextField
          label={t.newChallenge.yourName}
          value={yourName}
          onChange={(e) => setDisplayNameInput(e.target.value)}
          placeholder={t.newChallenge.namePlaceholderPerson}
          autoComplete="nickname"
          maxLength={24}
        />

        <Button type="submit" size="lg" fullWidth disabled={!valid || busy}>
          {busy ? t.newChallenge.creating : t.newChallenge.create}
        </Button>
      </form>
    </Screen>
  )
}
