import { useEffect, useState, type FormEvent } from 'react'
import type { Exercise } from '../db/index.ts'

const UNITS = ['reps', 'sec', 'min', 'km', 'kg']

interface Props {
  /** Existing exercise to edit, or null to create. */
  exercise: Exercise | null
  onSave: (name: string, unit: string) => void
  onArchive?: () => void
  onClose: () => void
}

export function ExerciseSheet({ exercise, onSave, onArchive, onClose }: Props) {
  const [name, setName] = useState(exercise?.name ?? '')
  const [unit, setUnit] = useState(exercise?.unit ?? 'reps')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    onSave(name, unit)
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end bg-black/60"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={exercise ? 'Edit exercise' : 'New exercise'}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full rounded-t-2xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <h3 className="mb-3 text-lg font-semibold">
          {exercise ? 'Edit exercise' : 'New exercise'}
        </h3>
        <label className="mb-3 block text-sm text-slate-400">
          Name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Burpees"
            className="mt-1 w-full rounded-lg bg-bg px-3 py-2 text-base text-slate-100 outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <div className="mb-4 text-sm text-slate-400">
          Unit
          <div className="mt-1 flex flex-wrap gap-2">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`rounded-full px-3 py-1 text-sm ${
                  unit === u
                    ? 'bg-accent text-slate-900'
                    : 'bg-bg text-slate-200'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {exercise && onArchive && (
            <button
              type="button"
              onClick={onArchive}
              className="rounded-lg px-4 py-2 text-sm text-red-400"
            >
              Archive
            </button>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}
