import Dexie, { type EntityTable } from 'dexie'
import type { Entry, Exercise, MetaRow } from './types.ts'

export class TallyDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  entries!: EntityTable<Entry, 'id'>
  meta!: EntityTable<MetaRow, 'key'>

  constructor() {
    super('tally')
    this.version(1).stores({
      // First entry is the primary key; the rest are indexes.
      exercises: 'id, name, createdAt, deletedAt, syncedAt',
      entries: 'id, exerciseId, loggedAt, [exerciseId+loggedAt], syncedAt',
      meta: 'key',
    })
  }
}

export const db = new TallyDB()
