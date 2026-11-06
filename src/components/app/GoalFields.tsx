import { needsGoalValue } from '../../challenges/logic.ts'
import { GOAL_TYPES, type GoalType } from '../../challenges/types.ts'
import { useT } from '../../i18n/index.ts'
import { unitName } from '../../lib/format.ts'
import { Field, SegmentedControl, TextField } from '../ui/index.ts'

export interface GoalFieldsProps {
  goalType: GoalType
  onGoalTypeChange: (goalType: GoalType) => void
  /** Digits as typed; '' while empty. */
  goalValue: string
  onGoalValueChange: (goalValue: string) => void
  /** The challenge exercise's unit key, e.g. 'reps'. */
  unit: string
}

/** Goal type picker plus the target a first-to or team goal needs. */
export function GoalFields({
  goalType,
  onGoalTypeChange,
  goalValue,
  onGoalValueChange,
  unit,
}: GoalFieldsProps) {
  const t = useT()
  const options = GOAL_TYPES.map((value) => ({
    value,
    label: t.challenges.goalType[value],
  }))
  const team = goalType === 'team'
  return (
    <>
      <Field label={t.newChallenge.goal}>
        <SegmentedControl
          aria-label={t.newChallenge.goalType}
          options={options}
          value={goalType}
          onChange={onGoalTypeChange}
        />
      </Field>

      {needsGoalValue(goalType) && (
        <div className="flex flex-col gap-2">
          <TextField
            label={
              team
                ? t.newChallenge.teamTarget(unitName(unit, t))
                : t.newChallenge.target(unitName(unit, t))
            }
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={goalValue}
            onChange={(e) =>
              onGoalValueChange(e.target.value.replace(/\D/g, ''))
            }
            placeholder={t.newChallenge.targetPlaceholder}
          />
          {team && (
            <span className="text-[13px] text-muted">
              {t.newChallenge.teamHint}
            </span>
          )}
        </div>
      )}
    </>
  )
}
