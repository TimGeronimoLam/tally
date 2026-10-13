import type { Exercise } from '../../db/index.ts'
import { useT } from '../../i18n/index.ts'
import { Chip, ChipRow } from '../ui/index.ts'

export interface ExercisePickerProps {
  exercises: Exercise[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Offer to create an exercise with this name when none matches. */
  suggestName?: string
  onCreate?: (name: string) => void
}

/** Chip row for choosing which local exercise counts toward a challenge. */
export function ExercisePicker({
  exercises,
  selectedId,
  onSelect,
  suggestName,
  onCreate,
}: ExercisePickerProps) {
  const t = useT()
  const hasMatch =
    !suggestName ||
    exercises.some(
      (e) => e.name.trim().toLowerCase() === suggestName.trim().toLowerCase(),
    )
  return (
    <ChipRow>
      {exercises.map((e) => (
        <Chip
          key={e.id}
          size="sm"
          selected={e.id === selectedId}
          onClick={() => onSelect(e.id)}
        >
          {e.name}
        </Chip>
      ))}
      {suggestName && onCreate && !hasMatch && (
        <Chip
          size="sm"
          className="border border-dashed border-border-strong bg-transparent"
          onClick={() => onCreate(suggestName)}
        >
          {t.newChallenge.createExercise(suggestName)}
        </Chip>
      )}
    </ChipRow>
  )
}
