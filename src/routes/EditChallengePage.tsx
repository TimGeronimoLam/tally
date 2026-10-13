import { useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import {
  GOAL_TYPES,
  challengeStatus,
  dateRangeOf,
  editedWindow,
  updateChallenge,
  useChallengeSummary,
  type ChallengeSummary,
  type GoalType,
} from '../challenges/index.ts'
import { DateRangeFields } from '../components/app/index.ts'
import {
  Button,
  Field,
  Gutter,
  Screen,
  ScreenNav,
  SegmentedControl,
  TextField,
} from '../components/ui/index.ts'
import { useT } from '../i18n/index.ts'
import { unitName } from '../lib/format.ts'
import { useNav } from '../lib/nav.ts'
import { useToast } from '../lib/toast.ts'

/** Host only: change a challenge's name, goal and dates until it ends. */
export function EditChallengePage() {
  const t = useT()
  const { id } = useParams()
  const nav = useNav()
  const { data: c, missing, loading, userId, refresh } = useChallengeSummary(id)
  const back = () => nav.pop(`/challenges/${id}`)

  const editable =
    c !== undefined &&
    userId !== null &&
    c.creatorId === userId &&
    challengeStatus(c) !== 'ended'

  if (!editable) {
    const note = missing
      ? t.challengeDetail.notOnList
      : c
        ? t.editChallenge.notEditable
        : loading
          ? t.common.loading
          : null
    return (
      <Screen>
        <ScreenNav
          title={t.editChallenge.title}
          backLabel={t.editChallenge.backLabel}
          onBack={back}
        />
        {note && (
          <Gutter className="pt-4 text-[15px] text-muted">{note}</Gutter>
        )}
      </Screen>
    )
  }
  return <EditForm c={c} onBack={back} onSaved={refresh} />
}

function EditForm({
  c,
  onBack,
  onSaved,
}: {
  c: ChallengeSummary
  onBack: () => void
  onSaved: () => Promise<void>
}) {
  const t = useT()
  const nav = useNav()
  const toast = useToast()
  const [name, setName] = useState(c.name)
  const [goalType, setGoalType] = useState<GoalType>(c.goalType)
  const [goalValue, setGoalValue] = useState(
    c.goalValue === null ? '' : String(c.goalValue),
  )
  const [range, setRange] = useState(() => dateRangeOf(c))
  const [busy, setBusy] = useState(false)

  const goal = Number(goalValue)
  const timeWindow = editedWindow(c, range)
  const valid =
    name.trim().length > 0 &&
    (goalType === 'most_reps' || goal > 0) &&
    timeWindow !== null
  const before = dateRangeOf(c)
  const changed =
    name.trim() !== c.name ||
    goalType !== c.goalType ||
    (goalType === 'first_to' && goal !== c.goalValue) ||
    range.startKey !== before.startKey ||
    range.endKey !== before.endKey

  const goalOptions = GOAL_TYPES.map((value) => ({
    value,
    label: t.challenges.goalType[value],
  }))

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || !changed || !timeWindow || busy) return
    setBusy(true)
    try {
      await updateChallenge(c.id, {
        name: name.trim(),
        goalType,
        goalValue: goalType === 'first_to' ? goal : null,
        startsAt: timeWindow.startsAt,
        endsAt: timeWindow.endsAt,
      })
      await onSaved()
      toast({ message: t.editChallenge.savedToast })
      nav.pop(`/challenges/${c.id}`, { replace: true })
    } catch (err) {
      toast({
        message:
          err instanceof Error ? err.message : t.editChallenge.couldNotSave,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen>
      <ScreenNav
        title={t.editChallenge.title}
        backLabel={t.editChallenge.backLabel}
        onBack={onBack}
      >
        <span className="text-sm text-muted">
          {c.exerciseName} · {t.editChallenge.appliesToEveryone}
        </span>
      </ScreenNav>

      <form onSubmit={submit} className="flex flex-col gap-5 px-5 pt-5 pb-8">
        <TextField
          label={t.newChallenge.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={c.name}
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
            label={t.newChallenge.target(unitName(c.unit, t))}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={goalValue}
            onChange={(e) => setGoalValue(e.target.value.replace(/\D/g, ''))}
            placeholder={t.newChallenge.targetPlaceholder}
          />
        )}

        <DateRangeFields
          range={range}
          onChange={setRange}
          hint={
            timeWindow
              ? t.newChallenge.customHint
              : t.newChallenge.customInvalid
          }
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={!valid || !changed || busy}
        >
          {busy ? t.editChallenge.saving : t.editChallenge.save}
        </Button>
      </form>
    </Screen>
  )
}
