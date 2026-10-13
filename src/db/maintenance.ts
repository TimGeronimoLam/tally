import { messages } from '../i18n/index.ts'
import { recordError } from '../lib/diagnostics.ts'
import { disableReminder } from '../reminders/index.ts'
import { db } from './db.ts'
import { seedIfNeeded } from './seed.ts'
import type { Entry, Exercise, UnlockedAchievement } from './types.ts'

export interface Snapshot {
  app: 'tally'
  version: 1
  exportedAt: string
  exercises: Exercise[]
  entries: Entry[]
  /** Added later; absent in early exports. */
  achievements?: UnlockedAchievement[]
}

export async function exportSnapshot(): Promise<Snapshot> {
  const [exercises, entries, achievements] = await Promise.all([
    db.exercises.toArray(),
    db.entries.toArray(),
    db.achievements.toArray(),
  ])
  return {
    app: 'tally',
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises,
    entries,
    achievements,
  }
}

/** Trigger a browser download of the current data as JSON. */
export async function downloadSnapshot(): Promise<void> {
  const snapshot = await exportSnapshot()
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tally-${snapshot.exportedAt.slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.app === 'tally' &&
    v.version === 1 &&
    Array.isArray(v.exercises) &&
    Array.isArray(v.entries)
  )
}

/**
 * Merge a snapshot into the local database. Rows are matched by id; existing
 * rows are overwritten, so importing your own export is idempotent.
 */
export async function importSnapshot(
  file: File,
): Promise<{ exercises: number; entries: number }> {
  const parsed: unknown = JSON.parse(await file.text())
  if (!isSnapshot(parsed)) {
    throw new Error(messages().errors.notExportFile)
  }
  await db.transaction(
    'rw',
    db.exercises,
    db.entries,
    db.achievements,
    async () => {
      await db.exercises.bulkPut(parsed.exercises)
      await db.entries.bulkPut(parsed.entries)
      if (parsed.achievements)
        await db.achievements.bulkPut(parsed.achievements)
    },
  )
  return { exercises: parsed.exercises.length, entries: parsed.entries.length }
}

/** Wipe everything and re-seed defaults. Irreversible. */
export async function resetAllData(): Promise<void> {
  // A wiped phone stops getting reminders; the UI would show it off anyway.
  await disableReminder().catch((err) => recordError('reminder', err))
  await db.transaction(
    'rw',
    db.exercises,
    db.entries,
    db.meta,
    db.achievements,
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.entries.clear(),
        db.meta.clear(),
        db.achievements.clear(),
      ])
    },
  )
  await seedIfNeeded()
}
