import { endOfDay, startOfDay } from '../lib/date.ts'
import { uuid } from '../lib/uuid.ts'
import { db } from './db.ts'
import type { Entry } from './types.ts'

export async function logEntry(
  exerciseId: string,
  amount: number,
  loggedAt = Date.now(),
): Promise<Entry> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('amount must be a positive number')
  }
  const entry: Entry = {
    id: uuid(),
    exerciseId,
    amount,
    loggedAt,
    createdAt: Date.now(),
  }
  await db.entries.add(entry)
  return entry
}

/** Soft delete; used by Undo. */
export async function deleteEntry(id: string): Promise<void> {
  await db.entries.update(id, { deletedAt: Date.now(), syncedAt: undefined })
}

export async function restoreEntry(id: string): Promise<void> {
  await db.entries.update(id, { deletedAt: undefined, syncedAt: undefined })
}

/** Live entries (not soft-deleted) for one exercise on the local day containing `at`. */
export function entriesForDay(exerciseId: string, at = Date.now()) {
  return db.entries
    .where('[exerciseId+loggedAt]')
    .between(
      [exerciseId, startOfDay(at)],
      [exerciseId, endOfDay(at)],
      true,
      false,
    )
    .filter((e) => e.deletedAt == null)
}

export async function totalForDay(
  exerciseId: string,
  at = Date.now(),
): Promise<number> {
  const rows = await entriesForDay(exerciseId, at).toArray()
  return rows.reduce((sum, e) => sum + e.amount, 0)
}
