import type { Exercise } from '../db/index.ts'

interface Props {
  exercises: Exercise[]
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onEdit: (exercise: Exercise) => void
}

export function ExerciseChips({
  exercises,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
}: Props) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
      {exercises.map((ex) => {
        const active = ex.id === selectedId
        return (
          <button
            key={ex.id}
            type="button"
            onClick={() => (active ? onEdit(ex) : onSelect(ex.id))}
            aria-pressed={active}
            title={active ? 'Tap again to edit' : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active ? 'bg-accent text-slate-900' : 'bg-surface text-slate-200'
            }`}
          >
            {ex.name}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add exercise"
        className="shrink-0 rounded-full border border-dashed border-slate-600 px-4 py-2 text-sm text-slate-400"
      >
        +
      </button>
    </div>
  )
}
