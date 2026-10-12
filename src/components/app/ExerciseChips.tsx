import type { Exercise } from '../../db/index.ts'
import { Chip, ChipRow, IconButton, PlusIcon } from '../ui/index.ts'

export interface ExerciseChipsProps {
  exercises: Exercise[]
  selectedId: string | null
  onSelect: (id: string) => void
  /** Tapping the already-selected chip. */
  onEdit: (exercise: Exercise) => void
  onAdd: () => void
}

/** Exercise picker row with a trailing "+" to add one. */
export function ExerciseChips({
  exercises,
  selectedId,
  onSelect,
  onEdit,
  onAdd,
}: ExerciseChipsProps) {
  return (
    <ChipRow>
      {exercises.map((ex) => {
        const selected = ex.id === selectedId
        return (
          <Chip
            key={ex.id}
            selected={selected}
            title={selected ? 'Tap again to edit' : undefined}
            onClick={() => (selected ? onEdit(ex) : onSelect(ex.id))}
          >
            {ex.name}
          </Chip>
        )
      })}
      <IconButton variant="outline" aria-label="Add exercise" onClick={onAdd}>
        <PlusIcon size={20} />
      </IconButton>
    </ChipRow>
  )
}
