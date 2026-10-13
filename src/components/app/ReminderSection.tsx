import { useEffect, useState } from 'react'
import { useReminder, type ReminderMeta } from '../../db/index.ts'
import { useT } from '../../i18n/index.ts'
import { formatTime } from '../../lib/format.ts'
import { useToast } from '../../lib/toast.ts'
import {
  DEFAULT_REMINDER_TIME,
  disableReminder,
  enableReminder,
  reminderAvailability,
  setReminderTime,
  type ReminderAvailability,
} from '../../reminders/index.ts'
import { ListGroup, ListRow, Switch } from '../ui/index.ts'

/** "19:00" in the app's clock style ("7:00 PM" in English). */
function formatClock(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return formatTime(d)
}

/**
 * Availability changes outside the app (permission in system settings, an
 * install), so it is read again whenever the app comes back to the front.
 */
function useAvailability(): [ReminderAvailability, () => void] {
  const [value, setValue] = useState(reminderAvailability)
  useEffect(() => {
    const refresh = () => setValue(reminderAvailability())
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])
  return [value, () => setValue(reminderAvailability())]
}

/**
 * The daily reminder rows on the Account screen: an on/off switch and,
 * while on, the time. Nothing here mentions accounts: turning it on with no
 * session creates an anonymous one, which the card above shows as
 * "Local only", as after a challenge join.
 */
export function ReminderSection() {
  const t = useT()
  const toast = useToast()
  const reminder = useReminder()
  const [availability, refresh] = useAvailability()
  const [busy, setBusy] = useState(false)

  function run(work: Promise<void>, success: string) {
    setBusy(true)
    work
      .then(() => toast({ message: success }))
      .catch((err: unknown) =>
        toast({
          message:
            err instanceof Error ? err.message : t.common.somethingWentWrong,
        }),
      )
      .finally(() => {
        setBusy(false)
        refresh()
      })
  }

  function toggle(on: boolean) {
    // Synchronous on purpose: enableReminder asks for notification
    // permission inside this tap.
    if (on) {
      run(
        enableReminder(DEFAULT_REMINDER_TIME),
        t.reminders.enabled(formatClock(DEFAULT_REMINDER_TIME)),
      )
    } else {
      run(disableReminder(), t.reminders.disabled)
    }
  }

  const unavailable = {
    ok: null,
    'install-first': t.reminders.installFirst,
    unsupported: t.reminders.unsupported,
    denied: t.reminders.denied,
  }[availability]

  return (
    <ListGroup>
      <ListRow
        label={t.reminders.daily}
        detail={
          unavailable ?? (
            <Switch
              aria-label={t.reminders.daily}
              checked={reminder != null}
              disabled={busy || reminder === undefined}
              onChange={toggle}
            />
          )
        }
      />
      {reminder && !unavailable && (
        <ReminderTimeRow key={reminder.endpoint} reminder={reminder} />
      )}
    </ListGroup>
  )
}

/**
 * The time, in the platform's own picker. Saved shortly after the last
 * change: desktop pickers report every typed digit, and iOS every turn of
 * the wheel.
 */
function ReminderTimeRow({ reminder }: { reminder: ReminderMeta }) {
  const t = useT()
  const toast = useToast()
  const [draft, setDraft] = useState(reminder.time)

  useEffect(() => {
    if (draft === reminder.time || !/^\d{2}:\d{2}$/.test(draft)) return
    const timer = window.setTimeout(() => {
      setReminderTime(draft).catch((err: unknown) => {
        setDraft(reminder.time)
        toast({
          message:
            err instanceof Error ? err.message : t.common.somethingWentWrong,
        })
      })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [draft, reminder.time, t, toast])

  return (
    <ListRow
      label={t.reminders.time}
      detail={
        <input
          type="time"
          aria-label={t.reminders.time}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="-my-2 h-11 bg-transparent text-right text-[15px] text-fg"
        />
      }
    />
  )
}
