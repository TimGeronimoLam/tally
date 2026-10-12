import Dexie, { type EntityTable } from 'dexie'
import type { Entry, Exercise, MetaRow, UnlockedAchievement } from './types.ts'

export class TallyDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  entries!: EntityTable<Entry, 'id'>
  meta!: EntityTable<MetaRow, 'key'>
  achievements!: EntityTable<UnlockedAchievement, 'id'>

  constructor() {
    super('tally')
    // First entry is the primary key; the rest are indexes.
    this.version(1).stores({
      exercises: 'id, name, createdAt, deletedAt, syncedAt',
      entries: 'id, exerciseId, loggedAt, [exerciseId+loggedAt], syncedAt',
      meta: 'key',
    })
    this.version(2).stores({
      achievements: 'id, unlockedAt',
    })
  }
}

export const db = new TallyDB()
