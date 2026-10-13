import { messages } from '../i18n/index.ts'
import { uuid } from '../lib/uuid.ts'
import { db } from './db.ts'
import { getMeta, setMeta } from './meta.ts'
import { META_KEYS, type Exercise } from './types.ts'

/** Named in the device language at first launch; renamed freely afterwards. */
function defaultExercises(): Array<Pick<Exercise, 'name' | 'unit'>> {
  const names = messages().defaultExercises
  return [
    { name: names.pushups, unit: 'reps' },
    { name: names.squats, unit: 'reps' },
    { name: names.pullups, unit: 'reps' },
    { name: names.plank, unit: 'sec' },
  ]
}

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
        defaultExercises().map((e, i) => ({
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
