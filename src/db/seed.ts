import { uuid } from '../lib/uuid.ts'
import { db } from './db.ts'
import { getMeta, setMeta } from './meta.ts'
import { META_KEYS, type Exercise } from './types.ts'

const DEFAULT_EXERCISES: Array<Pick<Exercise, 'name' | 'unit'>> = [
  { name: 'Pushups', unit: 'reps' },
  { name: 'Squats', unit: 'reps' },
  { name: 'Pull-ups', unit: 'reps' },
  { name: 'Plank', unit: 'sec' },
]

/** Idempotent first-launch setup: device id + default exercises. */
export async function seedIfNeeded(): Promise<void> {
  await db.transaction('rw', db.exercises, db.meta, async () => {
    if (!(await getMeta(META_KEYS.deviceId))) {
      await setMeta(META_KEYS.deviceId, uuid())
    }
    if (await getMeta(META_KEYS.seededAt)) return
    if ((await db.exercises.count()) === 0) {
      const now = Date.now()
      await db.exercises.bulkAdd(
        DEFAULT_EXERCISES.map((e, i) => ({
          id: uuid(),
          ...e,
          // Stagger createdAt so default ordering is stable.
          createdAt: now + i,
        })),
      )
    }
    await setMeta(META_KEYS.seededAt, Date.now())
  })
}
