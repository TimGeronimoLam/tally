import type { Session } from '@supabase/supabase-js'
import { db } from '../db/db.ts'
import { getMeta, setMeta } from '../db/meta.ts'
import { META_KEYS, type Entry, type Exercise } from '../db/types.ts'
import { messages } from '../i18n/index.ts'
import { recordError } from '../lib/diagnostics.ts'
import { onLocalChange } from '../lib/localChanges.ts'
import { uuid } from '../lib/uuid.ts'
import { supabase } from '../lib/supabase.ts'
import { planExerciseMerges } from './dedupe.ts'
import { planOwner, type SessionUser, type SyncOwner } from './owner.ts'
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
      reason: 'not-configured' | 'no-session' | 'other-owner' | 'failed'
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
  inflight = run(sessionUser(session)).finally(() => {
    inflight = null
  })
  return inflight
}

/** Debounced syncNow for bursts of local edits. */
export function scheduleSync(delayMs = 1500): void {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => void syncNow(), delayMs)
}

/** Drop a pending debounced run, e.g. right before signing out. */
export function cancelScheduledSync(): void {
  window.clearTimeout(debounce)
  debounce = undefined
}

/** True while some local row has not reached the server. */
export async function hasUnsyncedRows(): Promise<boolean> {
  const [exercises, entries] = await Promise.all([
    db.exercises.filter((e) => e.syncedAt == null).count(),
    db.entries.filter((e) => e.syncedAt == null).count(),
  ])
  return exercises + entries > 0
}

export function sessionUser(session: Session): SessionUser {
  return { id: session.user.id, anonymous: session.user.is_anonymous === true }
}

/** The local rows belong to another account; see owner.ts. */
export class OtherOwnerError extends Error {
  constructor() {
    super(messages().errors.otherAccountData)
    this.name = 'OtherOwnerError'
  }
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

async function run(user: SessionUser): Promise<SyncResult> {
  setSyncStatus({ state: 'syncing', error: null })
  try {
    await ensureSyncOwner(user)
    await pullExercises()
    await pullEntries()
    await mergeDuplicateExercises()
    await pushExercises()
    await pushEntries()
    setSyncStatus({ state: 'idle', lastSyncAt: Date.now(), error: null })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (err instanceof OtherOwnerError) {
      // Expected after a lost session; the account card shows it.
      setSyncStatus({ state: 'error', error: message })
      return { ok: false, reason: 'other-owner', error: message }
    }
    recordError('sync', err)
    setSyncStatus({ state: 'error', error: message })
    return { ok: false, reason: 'failed', error: message }
  }
}

let ownerInflight: Promise<void> | null = null

async function readOwner(): Promise<SyncOwner | null> {
  const id = await getMeta<string>(META_KEYS.syncUserId)
  if (id === undefined) return null
  return { id, anonymous: await getMeta<boolean>(META_KEYS.syncUserAnonymous) }
}

async function writeOwner(user: SessionUser): Promise<void> {
  await setMeta(META_KEYS.syncUserId, user.id)
  await setMeta(META_KEYS.syncUserAnonymous, user.anonymous)
}

/**
 * Sync markers belong to one account (owner.ts has the rules). Rows that
 * were never synced are adopted by whichever account signs in first. An
 * anonymous account's rows move to the email account that replaces it,
 * re-keyed because the server still holds them under the old user. Rows
 * that belong to another email account are refused: syncing them with
 * this user would make copies, so the user signs out (clearing the device)
 * first. Throws `OtherOwnerError` in that case.
 *
 * Concurrent callers (a sign-in triggers one sync, the challenge flow asks
 * for ownership too) share one run, and the owner is checked again inside
 * the transaction so the data is never re-keyed twice.
 */
export async function ensureSyncOwner(user: SessionUser): Promise<void> {
  const known = await readOwner()
  if (known?.id === user.id && known.anonymous !== undefined) return
  if (ownerInflight) return ownerInflight
  ownerInflight = db
    .transaction('rw', db.exercises, db.entries, db.meta, async () => {
      const owner = await readOwner()
      switch (planOwner(owner, user)) {
        case 'keep':
          // Backfill the flag on devices from before it existed.
          if (owner?.anonymous === undefined) await writeOwner(user)
          return
        case 'refuse':
          throw new OtherOwnerError()
        case 'adopt':
          // Never synced: nothing lives on the server yet, ids are free to use.
          await db.exercises.toCollection().modify(clearSyncedAt)
          await db.entries.toCollection().modify(clearSyncedAt)
          break
        case 'move':
          await rekeyLocalData()
          break
      }
      await db.meta.bulkDelete([
        META_KEYS.lastPullExercises,
        META_KEYS.lastPullEntries,
      ])
      await writeOwner(user)
    })
    .finally(() => {
      ownerInflight = null
    })
  return ownerInflight
}

function clearSyncedAt(row: { syncedAt?: number }): boolean {
  if (row.syncedAt == null) return false
  delete row.syncedAt
  return true
}

/** Give every exercise and entry a fresh id, keeping their relations. Runs inside a transaction. */
async function rekeyLocalData(): Promise<void> {
  const exercises = await db.exercises.toArray()
  const entries = await db.entries.toArray()
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
 * One live copy of each exercise (see dedupe.ts). After a pull the
 * account's copy of "Pushups" may sit next to this device's own: the seed
 * of a fresh install (maybe "Liegestütze", the same built-in), the seed
 * "Delete all data" made, or the copy re-keyed for another account. Each twin is folded into the one to keep: its entries
 * move over, it is archived (or dropped if the server never saw it), and
 * any challenge membership that counted it is pointed at the survivor so
 * the leaderboard keeps counting. The server is updated first; if that
 * fails nothing changes locally and the next sync tries again.
 */
async function mergeDuplicateExercises(): Promise<void> {
  const merges = planExerciseMerges(await db.exercises.toArray())
  if (merges.length === 0) return
  for (const { survivor, losers } of merges) {
    const { error } = await supabase!
      .from('challenge_members')
      .update({ exercise_id: survivor.id })
      .in(
        'exercise_id',
        losers.map((e) => e.id),
      )
    if (error) throw new Error(`merge exercises: ${error.message}`)
  }
  const now = Date.now()
  await db.transaction('rw', db.exercises, db.entries, db.meta, async () => {
    const last = await getMeta<string>(META_KEYS.lastExerciseId)
    for (const { survivor, losers } of merges) {
      for (const loser of losers) {
        // Re-read: the plan was made outside this transaction.
        const current = await db.exercises.get(loser.id)
        if (!current || current.deletedAt != null) continue
        await db.entries
          .where('exerciseId')
          .equals(loser.id)
          .modify((e) => {
            e.exerciseId = survivor.id
            delete e.syncedAt
          })
        if (current.syncedAt == null) {
          await db.exercises.delete(loser.id)
        } else {
          await db.exercises.update(loser.id, {
            deletedAt: now,
            syncedAt: undefined,
          })
        }
        if (last === loser.id) {
          await setMeta(META_KEYS.lastExerciseId, survivor.id)
        }
      }
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
