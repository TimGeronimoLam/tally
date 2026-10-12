import { useRef, useState, type ChangeEvent } from 'react'
import { ExerciseSheet } from '../components/app/index.ts'
import {
  Button,
  Card,
  ConfirmSheet,
  Gutter,
  ListGroup,
  ListRow,
  PlusIcon,
  Screen,
  ScreenHeader,
  SectionLabel,
  SegmentedControl,
} from '../components/ui/index.ts'
import {
  addExercise,
  archiveExercise,
  downloadSnapshot,
  importSnapshot,
  resetAllData,
  unarchiveExercise,
  updateExercise,
  useArchivedExercises,
  useEntryCount,
  useExercises,
  type Exercise,
} from '../db/index.ts'
import { formatNumber } from '../lib/format.ts'
import { THEME_OPTIONS, useThemePreference } from '../lib/theme.ts'
import { useToast } from '../lib/toast.ts'

type SheetState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; exercise: Exercise }
  | { mode: 'reset' }

export function AccountPage() {
  const toast = useToast()
  const exercises = useExercises() ?? []
  const archived = useArchivedExercises() ?? []
  const entryCount = useEntryCount()
  const [theme, setTheme] = useThemePreference()
  const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' })
  const fileInput = useRef<HTMLInputElement>(null)

  const closeSheet = () => setSheet({ mode: 'closed' })

  async function saveExercise(name: string, unit: string) {
    if (sheet.mode === 'add') await addExercise(name, unit)
    else if (sheet.mode === 'edit')
      await updateExercise(sheet.exercise.id, { name, unit })
    closeSheet()
  }

  async function archive() {
    if (sheet.mode !== 'edit') return
    await archiveExercise(sheet.exercise.id)
    closeSheet()
    toast({ message: `${sheet.exercise.name} archived` })
  }

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { entries } = await importSnapshot(file)
      toast({ message: `Imported ${formatNumber(entries)} entries` })
    } catch (err) {
      toast({ message: err instanceof Error ? err.message : 'Import failed' })
    }
  }

  async function reset() {
    await resetAllData()
    closeSheet()
    toast({ message: 'All data deleted' })
  }

  return (
    <Screen>
      <ScreenHeader title="Account" />

      <Gutter className="pt-4">
        <Card>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-semibold">Local only</span>
              <span className="text-[13px] leading-relaxed text-muted">
                Your data lives on this device. Sign in to back it up and sync
                across phones.
              </span>
            </div>
            <Button
              variant="inverse"
              fullWidth
              onClick={() =>
                toast({ message: 'Sync is coming in a later version' })
              }
            >
              Sign in to sync
            </Button>
          </div>
        </Card>
      </Gutter>

      <Gutter>
        <SectionLabel>Appearance</SectionLabel>
        <SegmentedControl
          aria-label="Theme"
          options={THEME_OPTIONS}
          value={theme}
          onChange={setTheme}
        />
      </Gutter>

      <Gutter>
        <SectionLabel>Exercises</SectionLabel>
        <ListGroup>
          {exercises.map((ex) => (
            <ListRow
              key={ex.id}
              label={ex.name}
              detail={ex.unit}
              onClick={() => setSheet({ mode: 'edit', exercise: ex })}
            />
          ))}
          <ListRow
            icon={<PlusIcon size={20} />}
            label={<span className="font-medium">Add exercise</span>}
            onClick={() => setSheet({ mode: 'add' })}
          />
        </ListGroup>
      </Gutter>

      {archived.length > 0 && (
        <Gutter>
          <SectionLabel>Archived</SectionLabel>
          <ListGroup>
            {archived.map((ex) => (
              <ListRow
                key={ex.id}
                label={ex.name}
                tone="muted"
                detail="Restore"
                onClick={() => void unarchiveExercise(ex.id)}
              />
            ))}
          </ListGroup>
        </Gutter>
      )}

      <Gutter>
        <SectionLabel>Data</SectionLabel>
        <ListGroup>
          <ListRow
            label="Export JSON"
            detail={`${formatNumber(entryCount)} entries`}
            onClick={() => void downloadSnapshot()}
          />
          <ListRow label="Import" onClick={() => fileInput.current?.click()} />
          <ListRow
            label="Delete all data"
            tone="danger"
            onClick={() => setSheet({ mode: 'reset' })}
          />
        </ListGroup>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={importFile}
        />
      </Gutter>

      <Gutter className="pt-5 pb-6 text-xs leading-relaxed text-faint">
        Tally {__APP_VERSION__} · Works offline · No tracking
      </Gutter>

      <ExerciseSheet
        key={sheet.mode === 'edit' ? sheet.exercise.id : sheet.mode}
        open={sheet.mode === 'add' || sheet.mode === 'edit'}
        exercise={sheet.mode === 'edit' ? sheet.exercise : null}
        onSave={saveExercise}
        onArchive={sheet.mode === 'edit' ? archive : undefined}
        onClose={closeSheet}
      />

      <ConfirmSheet
        open={sheet.mode === 'reset'}
        title="Delete all data?"
        message="Every exercise and entry on this device will be removed. This cannot be undone. Export first if you want a copy."
        confirmLabel="Delete everything"
        destructive
        onConfirm={reset}
        onClose={closeSheet}
      />
    </Screen>
  )
}
