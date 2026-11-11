import { useRef, useState, type ChangeEvent } from 'react'
import { APP_VERSION } from '../changelog/index.ts'
import {
  ExerciseSheet,
  FeatureRequestSheet,
  LanguageSheet,
  ReminderSection,
  SyncCard,
} from '../components/app/index.ts'
import {
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
import {
  MESSAGES,
  systemLocale,
  useLocalePreference,
  useT,
} from '../i18n/index.ts'
import { clearLastError, readLastError } from '../lib/diagnostics.ts'
import { formatNumber, unitName } from '../lib/format.ts'
import { THEME_PREFERENCES, useThemePreference } from '../lib/theme.ts'
import { useToast } from '../lib/toast.ts'
import { deleteAccount, useSession } from '../sync/index.ts'

type SheetState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; exercise: Exercise }
  | { mode: 'reset' }
  | { mode: 'deleteAccount' }
  | { mode: 'language' }
  | { mode: 'featureRequest' }

export function AccountPage() {
  const t = useT()
  const toast = useToast()
  const exercises = useExercises() ?? []
  const archived = useArchivedExercises() ?? []
  const entryCount = useEntryCount()
  const [theme, setTheme] = useThemePreference()
  const [localePref] = useLocalePreference()
  const [sheet, setSheet] = useState<SheetState>({ mode: 'closed' })
  const [lastError, setLastError] = useState(readLastError)
  const fileInput = useRef<HTMLInputElement>(null)
  const { session } = useSession()
  // Anonymous sessions look signed out in the UI; nothing to delete there.
  const hasAccount = !!session && !session.user.is_anonymous
  const [deleting, setDeleting] = useState(false)

  const closeSheet = () => setSheet({ mode: 'closed' })

  const themeOptions = THEME_PREFERENCES.map((value) => ({
    value,
    label: t.account.themes[value],
  }))
  const languageDetail =
    localePref === 'system'
      ? t.account.languageSystemDetail(
          MESSAGES[systemLocale()?.locale ?? 'en'].name,
        )
      : MESSAGES[localePref].name

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
    toast({ message: t.exerciseSheet.archived(sheet.exercise.name) })
  }

  async function importFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { entries } = await importSnapshot(file)
      toast({ message: t.account.imported(formatNumber(entries)) })
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : t.account.importFailed,
      })
    }
  }

  async function reset() {
    await resetAllData()
    closeSheet()
    toast({ message: t.account.allDeleted })
  }

  async function removeAccount() {
    closeSheet()
    setDeleting(true)
    try {
      await deleteAccount()
      toast({ message: t.account.accountDeleted })
    } catch (err) {
      toast({
        message:
          err instanceof Error ? err.message : t.common.somethingWentWrong,
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Screen>
      <ScreenHeader title={t.account.title} />

      <Gutter className="pt-4">
        <SyncCard />
      </Gutter>

      <Gutter>
        <SectionLabel>{t.reminders.title}</SectionLabel>
        <ReminderSection />
      </Gutter>

      <Gutter>
        <SectionLabel>{t.account.appearance}</SectionLabel>
        <SegmentedControl
          aria-label={t.account.theme}
          options={themeOptions}
          value={theme}
          onChange={setTheme}
        />
        <ListGroup className="mt-3">
          <ListRow
            label={t.account.language}
            detail={languageDetail}
            onClick={() => setSheet({ mode: 'language' })}
          />
        </ListGroup>
      </Gutter>

      <Gutter>
        <SectionLabel>{t.account.exercises}</SectionLabel>
        <ListGroup>
          {exercises.map((ex) => (
            <ListRow
              key={ex.id}
              label={ex.name}
              detail={unitName(ex.unit, t)}
              onClick={() => setSheet({ mode: 'edit', exercise: ex })}
            />
          ))}
          <ListRow
            icon={<PlusIcon size={20} />}
            label={<span className="font-medium">{t.account.addExercise}</span>}
            onClick={() => setSheet({ mode: 'add' })}
          />
        </ListGroup>
      </Gutter>

      {archived.length > 0 && (
        <Gutter>
          <SectionLabel>{t.account.archived}</SectionLabel>
          <ListGroup>
            {archived.map((ex) => (
              <ListRow
                key={ex.id}
                label={ex.name}
                tone="muted"
                detail={t.account.restore}
                onClick={() => void unarchiveExercise(ex.id)}
              />
            ))}
          </ListGroup>
        </Gutter>
      )}

      <Gutter>
        <SectionLabel>{t.account.data}</SectionLabel>
        <ListGroup>
          <ListRow
            label={t.account.exportJson}
            detail={t.account.entries(formatNumber(entryCount))}
            onClick={() => void downloadSnapshot()}
          />
          <ListRow
            label={t.account.import}
            onClick={() => fileInput.current?.click()}
          />
          <ListRow
            label={t.account.deleteAll}
            tone="danger"
            onClick={() => setSheet({ mode: 'reset' })}
          />
          {hasAccount && (
            <ListRow
              label={
                deleting ? t.account.deletingAccount : t.account.deleteAccount
              }
              tone="danger"
              disabled={deleting}
              onClick={() => setSheet({ mode: 'deleteAccount' })}
            />
          )}
        </ListGroup>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={importFile}
        />
      </Gutter>

      <Gutter>
        <SectionLabel>{t.account.about}</SectionLabel>
        <ListGroup>
          <ListRow
            label={t.changelog.whatsNew}
            detail={t.changelog.version(APP_VERSION)}
            to="/account/whats-new"
          />
          <ListRow
            label={t.account.requestFeature}
            onClick={() => setSheet({ mode: 'featureRequest' })}
          />
        </ListGroup>
      </Gutter>

      <Gutter className="text-xs leading-relaxed text-faint empty:hidden">
        {lastError && (
          <div className="pt-5 break-words">
            {t.account.lastError} ({new Date(lastError.at).toLocaleString()},{' '}
            {lastError.where}): {lastError.message}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => {
                clearLastError()
                setLastError(null)
              }}
            >
              {t.account.clear}
            </button>
          </div>
        )}
      </Gutter>

      <div className="pb-6" />

      <ExerciseSheet
        key={sheet.mode === 'edit' ? sheet.exercise.id : sheet.mode}
        open={sheet.mode === 'add' || sheet.mode === 'edit'}
        exercise={sheet.mode === 'edit' ? sheet.exercise : null}
        onSave={saveExercise}
        onArchive={sheet.mode === 'edit' ? archive : undefined}
        onClose={closeSheet}
      />

      <LanguageSheet open={sheet.mode === 'language'} onClose={closeSheet} />

      <FeatureRequestSheet
        key={sheet.mode === 'featureRequest' ? 'open' : 'closed'}
        open={sheet.mode === 'featureRequest'}
        defaultEmail={hasAccount ? (session?.user.email ?? '') : ''}
        onSent={() => {
          closeSheet()
          toast({ message: t.account.featureSent })
        }}
        onClose={closeSheet}
      />

      <ConfirmSheet
        open={sheet.mode === 'reset'}
        title={t.account.deleteAllTitle}
        message={t.account.deleteAllMessage}
        confirmLabel={t.account.deleteEverything}
        destructive
        onConfirm={reset}
        onClose={closeSheet}
      />

      <ConfirmSheet
        open={sheet.mode === 'deleteAccount'}
        title={t.account.deleteAccountTitle}
        message={t.account.deleteAccountMessage(session?.user.email ?? '')}
        confirmLabel={t.account.deleteAccount}
        destructive
        onConfirm={() => void removeAccount()}
        onClose={closeSheet}
      />
    </Screen>
  )
}
