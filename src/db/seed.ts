import { messages } from '../i18n/index.ts'
import { uuid } from '../lib/uuid.ts'
import { BUILTIN_EXERCISES, BUILTIN_UNITS } from './builtins.ts'
import { db } from './db.ts'
import { getMeta, setMeta } from './meta.ts'
import { META_KEYS, type Exercise } from './types.ts'

/** The built-ins, named in the current language (shown in whichever is active). */
function defaultExercises(): Array<
  Pick<Exercise, 'name' | 'unit' | 'builtin'>
> {
  const names = messages().defaultExercises
  return BUILTIN_EXERCISES.map((builtin) => ({
    name: names[builtin],
    unit: BUILTIN_UNITS[builtin],
    builtin,
  }))
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
