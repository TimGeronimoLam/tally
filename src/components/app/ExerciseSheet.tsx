import { useState, type FormEvent } from 'react'
import { UNITS, type Exercise } from '../../db/index.ts'
import { Button, Chip, Sheet, TextField } from '../ui/index.ts'

export interface ExerciseSheetProps {
  open: boolean
  /** Existing exercise to edit, or null to create one. */
  exercise: Exercise | null
  onSave: (name: string, unit: string) => void
  onArchive?: () => void
  onClose: () => void
}

/**
 * Create / edit an exercise. Mount with a `key` that changes per exercise so
 * the form state resets.
 */
export function ExerciseSheet({
  open,
  exercise,
  onSave,
  onArchive,
  onClose,
}: ExerciseSheetProps) {
  const [name, setName] = useState(exercise?.name ?? '')
  const [unit, setUnit] = useState<string>(exercise?.unit ?? 'reps')
  const valid = name.trim().length > 0

  function submit(e: FormEvent) {
    e.preventDefault()
    if (valid) onSave(name, unit)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={exercise ? 'Edit exercise' : 'New exercise'}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextField
          label="Name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Burpees"
          autoComplete="off"
        />
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-medium">Unit</span>
          <div className="flex flex-wrap gap-2">
            {UNITS.map((u) => (
              <Chip
                key={u}
                size="sm"
                selected={unit === u}
                onClick={() => setUnit(u)}
              >
                {u}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          {exercise && onArchive && (
            <Button variant="danger" size="md" onClick={onArchive}>
              Archive
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="md" disabled={!valid}>
            Save
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
