import { db } from '../db/db.ts'
import { getMeta, setMeta } from '../db/meta.ts'
import { META_KEYS, type Entry, type Exercise } from '../db/types.ts'
import { onLocalChange } from '../lib/localChanges.ts'
import { uuid } from '../lib/uuid.ts'
import { supabase } from '../lib/supabase.ts'
import {
  entryToRow,
  exerciseToRow,
  mergeEntry,
  mergeExercise,
  rowToEntry,
  rowToExercise,
  sameContent,
  type EntryRow,
  type ExerciseRow,
} from './mapping.ts'
import { setSyncStatus } from './status.ts'

const PAGE_SIZE = 1000
const PUSH_CHUNK = 500
const EPOCH = '1970-01-01T00:00:00.000Z'

export type SyncResult =
  | { ok: true }
  | {
      ok: false
      reason: 'not-configured' | 'no-session' | 'failed'
      error?: string
    }

let inflight: Promise<SyncResult> | null = null
let debounce: number | undefined

/**
 * Pull remote changes, merge, then push local changes. Safe to call often:
 * concurrent calls share one run. No-op without a client or a session.
 */
export async function syncNow(): Promise<SyncResult> {
  if (!supabase) return { ok: false, reason: 'not-configured' }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, reason: 'no-session' }
  if (inflight) return inflight
  inflight = run(session.user.id).finally(() => {
    inflight = null
  })
  return inflight
}

/** Debounced syncNow for bursts of local edits. */
export function scheduleSync(delayMs = 1500): void {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => void syncNow(), delayMs)
}

/** Wire up the automatic triggers. Call once at startup. */
export function startSyncTriggers(): () => void {
  const onVisible = () => {
    if (document.visibilityState === 'visible') scheduleSync(0)
  }
  const onOnline = () => scheduleSync(0)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  const offLocal = onLocalChange(() => scheduleSync())
  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onOnline)
    offLocal()
  }
}

async function run(userId: string): Promise<SyncResult> {
  setSyncStatus({ state: 'syncing', error: null })
  try {
    await ensureSyncOwner(userId)
    await pullExercises()
    await pullEntries()
    await pushExercises()
    await pushEntries()
    setSyncStatus({ state: 'idle', lastSyncAt: Date.now(), error: null })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    setSyncStatus({ state: 'error', error: message })
    return { ok: false, reason: 'failed', error: message }
  }
}

/**
 * Sync markers belong to one account. If a different user signs in on this
 * device, every local row must be pushed to the new account. Rows that were
 * already pushed under the previous owner keep their ids on the server, so
 * they are re-keyed first: the new account gets its own copies.
 */
async function ensureSyncOwner(userId: string): Promise<void> {
  const owner = await getMeta<string>(META_KEYS.syncUserId)
  if (owner === userId) return
  await db.transaction('rw', db.exercises, db.entries, db.meta, async () => {
    if (owner === undefined) {
      // Never synced: nothing lives on the server yet, ids are free to use.
      await db.exercises.toCollection().modify({ syncedAt: undefined })
      await db.entries.toCollection().modify({ syncedAt: undefined })
    } else {
      await rekeyLocalData()
    }
    await db.meta.bulkDelete([
      META_KEYS.lastPullExercises,
      META_KEYS.lastPullEntries,
    ])
    await setMeta(META_KEYS.syncUserId, userId)
  })
}

/** Give every exercise and entry a fresh id, keeping their relations. Runs inside a transaction. */
async function rekeyLocalData(): Promise<void> {
  const [exercises, entries] = await Promise.all([
    db.exercises.toArray(),
    db.entries.toArray(),
  ])
  const exerciseIds = new Map(exercises.map((e) => [e.id, uuid()]))
  await db.exercises.clear()
  await db.entries.clear()
  await db.exercises.bulkAdd(
    exercises.map((e) => ({
      ...e,
      id: exerciseIds.get(e.id)!,
      syncedAt: undefined,
    })),
  )
  await db.entries.bulkAdd(
    entries.map((e) => ({
      ...e,
      id: uuid(),
      exerciseId: exerciseIds.get(e.exerciseId) ?? e.exerciseId,
      syncedAt: undefined,
    })),
  )
  const last = await getMeta<string>(META_KEYS.lastExerciseId)
  if (last && exerciseIds.has(last)) {
    await setMeta(META_KEYS.lastExerciseId, exerciseIds.get(last)!)
  }
}

/* ---------- pull ---------- */

async function fetchSince<Row extends { updated_at: string }>(
  table: 'exercises' | 'entries',
  since: string,
  page: number,
): Promise<Row[]> {
  const from = page * PAGE_SIZE
  const { data, error } = await supabase!
    .from(table)
    .select('*')
    .gt('updated_at', since)
    .order('updated_at', { ascending: true })
    .order('id', { ascending: true })
    .range(from, from + PAGE_SIZE - 1)
  if (error) throw new Error(`pull ${table}: ${error.message}`)
  return (data ?? []) as Row[]
}

async function pullExercises(): Promise<void> {
  const since = (await getMeta<string>(META_KEYS.lastPullExercises)) ?? EPOCH
  let page = 0
  let newest = since
  for (;;) {
    const rows = await fetchSince<ExerciseRow>('exercises', since, page)
    if (rows.length === 0) break
    const now = Date.now()
    await db.transaction('rw', db.exercises, async () => {
      const locals = await db.exercises.bulkGet(rows.map((r) => r.id))
      await db.exercises.bulkPut(
        rows.map((r, i) => mergeExercise(locals[i], rowToExercise(r, now))),
      )
    })
    newest = rows[rows.length - 1].updated_at
    if (rows.length < PAGE_SIZE) break
    page++
  }
  if (newest !== since) await setMeta(META_KEYS.lastPullExercises, newest)
  await dropDuplicateSeeds()
}

async function pullEntries(): Promise<void> {
  const since = (await getMeta<string>(META_KEYS.lastPullEntries)) ?? EPOCH
  let page = 0
  let newest = since
  for (;;) {
    const rows = await fetchSince<EntryRow>('entries', since, page)
    if (rows.length === 0) break
    const now = Date.now()
    await db.transaction('rw', db.entries, async () => {
      const locals = await db.entries.bulkGet(rows.map((r) => r.id))
      await db.entries.bulkPut(
        rows.map((r, i) => mergeEntry(locals[i], rowToEntry(r, now))),
      )
    })
    newest = rows[rows.length - 1].updated_at
    if (rows.length < PAGE_SIZE) break
    page++
  }
  if (newest !== since) await setMeta(META_KEYS.lastPullEntries, newest)
}

/**
 * A fresh install seeds default exercises. When an existing account is then
 * pulled in, those untouched seeds would duplicate the account's own
 * exercises. Drop a never-pushed, never-used local exercise whose name
 * matches a synced one.
 */
async function dropDuplicateSeeds(): Promise<void> {
  await db.transaction('rw', db.exercises, db.entries, async () => {
    const all = await db.exercises.toArray()
    const synced = new Map(
      all
        .filter((e) => e.syncedAt != null && e.deletedAt == null)
        .map((e) => [e.name.trim().toLowerCase(), e]),
    )
    for (const e of all) {
      if (e.syncedAt != null) continue
      const twin = synced.get(e.name.trim().toLowerCase())
      if (!twin || twin.id === e.id) continue
      const used = await db.entries.where('exerciseId').equals(e.id).count()
      if (used === 0) await db.exercises.delete(e.id)
    }
  })
}

/* ---------- push ---------- */

async function pushExercises(): Promise<void> {
  const dirty = await db.exercises.filter((e) => e.syncedAt == null).toArray()
  for (let i = 0; i < dirty.length; i += PUSH_CHUNK) {
    const chunk = dirty.slice(i, i + PUSH_CHUNK)
    const { error } = await supabase!
      .from('exercises')
      .upsert(chunk.map(exerciseToRow), { onConflict: 'id' })
    if (error) throw new Error(`push exercises: ${error.message}`)
    await markSynced(db.exercises, chunk)
  }
}

async function pushEntries(): Promise<void> {
  const dirty = await db.entries.filter((e) => e.syncedAt == null).toArray()
  for (let i = 0; i < dirty.length; i += PUSH_CHUNK) {
    const chunk = dirty.slice(i, i + PUSH_CHUNK)
    const { error } = await supabase!
      .from('entries')
      .upsert(chunk.map(entryToRow), { onConflict: 'id' })
    if (error) throw new Error(`push entries: ${error.message}`)
    await markSynced(db.entries, chunk)
  }
}

/** Stamp syncedAt on rows that still match what was pushed. */
async function markSynced<T extends Exercise | Entry>(
  table: typeof db.exercises | typeof db.entries,
  pushed: T[],
): Promise<void> {
  const snapshot = new Map(pushed.map((r) => [r.id, r]))
  const now = Date.now()
  await (table as typeof db.entries)
    .where('id')
    .anyOf([...snapshot.keys()])
    .modify((row) => {
      const before = snapshot.get(row.id) as Entry | undefined
      if (before && sameContent(row, before)) row.syncedAt = now
    })
}
