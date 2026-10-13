import { useEffect, useRef, useState } from 'react'
import { evaluateAchievements } from '../achievements/index.ts'
import {
  ExerciseChips,
  ExerciseSheet,
  InstallBanner,
} from '../components/app/index.ts'
import {
  BigNumber,
  Button,
  Gutter,
  Keypad,
  Screen,
  ScreenHeader,
  useNumericKeypad,
} from '../components/ui/index.ts'
import {
  META_KEYS,
  addExercise,
  archiveExercise,
  deleteEntry,
  logEntry,
  setMeta,
  updateExercise,
  useExercises,
  useSelectedExercise,
  useTodayEntries,
  type Exercise,
} from '../db/index.ts'
import { formatHeaderDate, formatNumber, unitLabel } from '../lib/format.ts'
import { haptic } from '../lib/haptics.ts'
import { useToast } from '../lib/toast.ts'

type SheetState =
  { mode: 'closed' } | { mode: 'add' } | { mode: 'edit'; exercise: Exercise }

export function LogPage() {
  const toast = useToast()
  const exercises = useExercises()
  const selected = useSelectedExercise(exercises)
  const todayEntries = useTodayEntries(selected?.id)
  const todayTotal = todayEntries.reduce((sum, e) => sum + e.amount, 0)
  const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' })

  // Enter on a physical keyboard submits; the ref avoids a hook ordering cycle.
  const submitRef = useRef<() => void>(() => {})
  const keypad = useNumericKeypad({
    maxDigits: 4,
    keyboard: true,
    onSubmit: () => submitRef.current(),
  })

  const canLog = selected !== null && keypad.number > 0

  async function log() {
    if (!selected || keypad.number <= 0) return
    const n = keypad.number
    haptic('confirm')
    const entry = await logEntry(selected.id, n)
    keypad.clear()
    toast({
      message: `${formatNumber(n)} ${unitLabel(selected)} logged`,
      action: { label: 'Undo', onClick: () => void deleteEntry(entry.id) },
    })
    for (const a of await evaluateAchievements()) {
      toast({ message: `Achievement unlocked: ${a.title}`, queue: true })
    }
  }
  useEffect(() => {
    submitRef.current = log
  })

  function select(id: string) {
    void setMeta(META_KEYS.lastExerciseId, id)
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
    <Screen>
      <ScreenHeader title="Log" meta={formatHeaderDate()} />

      <Gutter className="pt-3 empty:hidden">
        <InstallBanner />
      </Gutter>

      <Gutter className="pt-4">
        <ExerciseChips
          exercises={exercises}
          selectedId={selected?.id ?? null}
          onSelect={select}
          onEdit={(exercise) => setSheet({ mode: 'edit', exercise })}
          onAdd={() => setSheet({ mode: 'add' })}
        />
      </Gutter>

      <div className="flex flex-1 flex-col items-center justify-center px-5">
        {selected ? (
          <BigNumber
            value={keypad.value || '0'}
            placeholder={!keypad.value}
            unit={unitLabel(selected)}
          />
        ) : (
          <p className="text-[15px] text-muted">
            Add an exercise to start logging.
          </p>
        )}
      </div>

      {selected && (
        <>
          <Gutter className="flex items-center justify-between pb-3 text-[15px]">
            <span className="text-muted">Today</span>
            <span className="font-semibold">
              {formatNumber(todayTotal)} {unitLabel(selected)}
            </span>
          </Gutter>
          <Gutter className="pb-3">
            <Button size="lg" fullWidth disabled={!canLog} onClick={log}>
              Log
            </Button>
          </Gutter>
          <Keypad onKey={keypad.press} className="px-3 pb-2.5" />
        </>
      )}

      <ExerciseSheet
        key={sheet.mode === 'edit' ? sheet.exercise.id : sheet.mode}
        open={sheet.mode !== 'closed'}
        exercise={sheet.mode === 'edit' ? sheet.exercise : null}
        onSave={saveSheet}
        onArchive={sheet.mode === 'edit' ? archive : undefined}
        onClose={() => setSheet({ mode: 'closed' })}
      />
    </Screen>
  )
}
