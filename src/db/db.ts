import Dexie, { type EntityTable } from 'dexie'
import { builtinNamedInAnyLanguage } from './builtins.ts'
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
    // Built-ins got a key (builtins.ts). Defaults seeded before that are
    // found by name, in whichever language they were seeded. The server
    // copies get the same key from a migration, so nothing is pushed.
    this.version(3)
      .stores({})
      .upgrade((tx) =>
        tx
          .table<Exercise>('exercises')
          .toCollection()
          .modify((e) => {
            const builtin = e.builtin ?? builtinNamedInAnyLanguage(e.name)
            if (builtin) e.builtin = builtin
          }),
      )
  }
}

export const db = new TallyDB()
