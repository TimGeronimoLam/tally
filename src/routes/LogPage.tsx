import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ExerciseChips } from '../components/ExerciseChips.tsx'
import { ExerciseSheet } from '../components/ExerciseSheet.tsx'
import { useToast } from '../lib/toast.ts'
import {
  META_KEYS,
  addExercise,
  archiveExercise,
  db,
  deleteEntry,
  entriesForDay,
  getMeta,
  logEntry,
  setMeta,
  updateExercise,
  type Entry,
  type Exercise,
} from '../db/index.ts'

type Sheet =
  { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; exercise: Exercise }

export function LogPage() {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [amount, setAmount] = useState('')
  const [sheet, setSheet] = useState<Sheet>({ mode: 'closed' })

  const exercises = useLiveQuery(
    () => db.exercises.filter((e) => e.deletedAt == null).sortBy('createdAt'),
    [],
  )
  const lastExerciseId = useLiveQuery(
    () => getMeta<string>(META_KEYS.lastExerciseId),
    [],
  )

  // Selected = persisted choice if still live, else the first exercise.
  const selected =
    exercises?.find((e) => e.id === lastExerciseId) ?? exercises?.[0] ?? null

  const todayEntries = useLiveQuery(
    () =>
      selected
        ? entriesForDay(selected.id).toArray()
        : Promise.resolve<Entry[]>([]),
    [selected?.id],
  )
  const todayTotal = todayEntries?.reduce((s, e) => s + e.amount, 0) ?? 0

  useEffect(() => {
    inputRef.current?.focus()
  }, [selected?.id])

  function select(id: string) {
    void setMeta(META_KEYS.lastExerciseId, id)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = Number(amount)
    if (!selected || !Number.isFinite(n) || n <= 0) return
    const entry = await logEntry(selected.id, n)
    setAmount('')
    inputRef.current?.focus()
    toast({
      message: `${n} ${selected.unit} ${selected.name.toLowerCase()} logged`,
      action: { label: 'Undo', onClick: () => void deleteEntry(entry.id) },
    })
  }

  async function saveSheet(name: string, unit: string) {
    if (sheet.mode === 'add') {
      const ex = await addExercise(name, unit)
      select(ex.id)
    } else if (sheet.mode === 'edit') {
      await updateExercise(sheet.exercise.id, { name, unit })
    }
    setSheet({ mode: 'closed' })
  }

  async function archive() {
    if (sheet.mode !== 'edit') return
    await archiveExercise(sheet.exercise.id)
    setSheet({ mode: 'closed' })
    toast({ message: `${sheet.exercise.name} archived` })
  }

  if (!exercises) return null

  return (
    <section className="flex flex-col gap-6 py-2">
      <ExerciseChips
        exercises={exercises}
        selectedId={selected?.id ?? null}
        onSelect={select}
        onAdd={() => setSheet({ mode: 'add' })}
        onEdit={(exercise) => setSheet({ mode: 'edit', exercise })}
      />

      {selected ? (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-slate-400">Today</p>
            <p className="text-5xl font-bold tabular-nums">
              {todayTotal}
              <span className="ml-2 text-lg font-normal text-slate-400">
                {selected.unit}
              </span>
            </p>
          </div>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="done"
            placeholder="0"
            aria-label={`Amount in ${selected.unit}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            className="w-full rounded-xl bg-surface px-4 py-4 text-center text-4xl font-semibold tabular-nums outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={!amount}
            className="rounded-xl bg-accent py-4 text-lg font-semibold text-slate-900 disabled:opacity-40"
          >
            Log {selected.name}
          </button>
        </form>
      ) : (
        <p className="text-slate-400">Add an exercise to start logging.</p>
      )}

      {todayEntries && todayEntries.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-slate-400">
          {[...todayEntries].reverse().map((e) => (
            <li key={e.id} className="flex justify-between">
              <span>
                {new Date(e.loggedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="tabular-nums">
                {e.amount} {selected?.unit}
              </span>
            </li>
          ))}
        </ul>
      )}

      {sheet.mode !== 'closed' && (
        <ExerciseSheet
          key={sheet.mode === 'edit' ? sheet.exercise.id : 'new'}
          exercise={sheet.mode === 'edit' ? sheet.exercise : null}
          onSave={saveSheet}
          onArchive={sheet.mode === 'edit' ? archive : undefined}
          onClose={() => setSheet({ mode: 'closed' })}
        />
      )}
    </section>
  )
}
