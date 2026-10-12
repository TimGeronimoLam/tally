import { useState } from 'react'
import { useDisplayName } from '../../db/index.ts'
import { formatTime } from '../../lib/format.ts'
import { isSyncConfigured } from '../../lib/supabase.ts'
import { useToast } from '../../lib/toast.ts'
import {
  DISPLAY_NAME_MAX,
  setDisplayName,
  signInWithEmail,
  signOut,
  syncNow,
  useSession,
  useSyncStatus,
} from '../../sync/index.ts'
import { Avatar, Button, Card, InputSheet } from '../ui/index.ts'
import { EmailSheet } from './EmailSheet.tsx'

type SheetMode = 'closed' | 'name' | 'email'

/**
 * Account block at the top of the Account screen: the user's name, then
 * either "local only / sign in" or the signed-in email with sync status.
 * An anonymous session, created silently when joining a challenge, is
 * presented exactly like signed out; an email sign-in upgrades that user.
 */
export function SyncCard() {
  const toast = useToast()
  const { session, ready } = useSession()
  const status = useSyncStatus()
  const name = useDisplayName()
  const [sheet, setSheet] = useState<SheetMode>('closed')
  const [busy, setBusy] = useState(false)

  async function act(fn: () => Promise<unknown>, success?: string) {
    setBusy(true)
    try {
      await fn()
      if (success) toast({ message: success })
    } catch (err) {
      toast({
        message: err instanceof Error ? err.message : 'Something went wrong',
      })
    } finally {
      setBusy(false)
    }
  }

  if (!ready || name === undefined) return <Card className="h-[180px]" />

  const user = session?.user
  const email =
    isSyncConfigured && user && !user.is_anonymous ? user.email : undefined

  const syncLine =
    status.state === 'syncing'
      ? 'Syncing…'
      : status.state === 'error'
        ? `Sync failed: ${status.error}`
        : status.lastSyncAt
          ? `Last synced ${formatTime(status.lastSyncAt)}`
          : 'Waiting for first sync'

  return (
    <>
      <Card>
        <div className="flex flex-col gap-4">
          <ProfileRow name={name} onEdit={() => setSheet('name')} />
          <hr className="border-0 border-t border-border-strong/60" />

          {email ? (
            <>
              <Block
                title={email}
                body={syncLine}
                error={status.state === 'error'}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => act(syncNow)}
                >
                  Sync now
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={busy}
                  onClick={() =>
                    act(signOut, 'Signed out. Your data stays on this phone.')
                  }
                >
                  Sign out
                </Button>
              </div>
            </>
          ) : (
            <>
              <Block
                title="Local only"
                body={
                  isSyncConfigured
                    ? 'Your data lives on this device. Sign in to back it up and sync across phones.'
                    : 'Your data lives on this device. Sync is not configured in this build.'
                }
              />
              {isSyncConfigured && (
                <Button
                  variant="inverse"
                  fullWidth
                  onClick={() => setSheet('email')}
                >
                  Sign in with email
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      <InputSheet
        key={`name-${sheet}`}
        open={sheet === 'name'}
        title={name ? 'Your name' : 'Add your name'}
        description="Shown to others on challenge leaderboards."
        label="Name"
        initialValue={name}
        submitLabel="Save"
        cancelLabel="Cancel"
        validate={(v) =>
          v.length > 0 && v.length <= DISPLAY_NAME_MAX
            ? true
            : `Use 1 to ${DISPLAY_NAME_MAX} characters`
        }
        onSubmit={async (value) => {
          await setDisplayName(value)
          setSheet('closed')
        }}
        onClose={() => setSheet('closed')}
        inputProps={{
          placeholder: 'e.g. Tim',
          autoComplete: 'nickname',
          maxLength: DISPLAY_NAME_MAX,
        }}
      />
      <EmailSheet
        key={`email-${sheet}`}
        open={sheet === 'email'}
        title="Sign in"
        description="We'll email you a sign-in link. No password needed; the same link creates your account the first time."
        submitLabel="Send link"
        onSubmit={async (addr) => {
          await signInWithEmail(addr)
          setSheet('closed')
          toast({ message: `Link sent to ${addr}` })
        }}
        onClose={() => setSheet('closed')}
      />
    </>
  )
}

function ProfileRow({ name, onEdit }: { name: string; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex w-full items-center gap-3 text-left"
    >
      <Avatar
        initial={name || '?'}
        highlight={!!name}
        className="size-10 text-[15px]"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-semibold">
          {name || 'Add your name'}
        </span>
        <span className="text-[12px] text-muted">
          {name ? 'Name on leaderboards' : 'Shown on challenge leaderboards'}
        </span>
      </span>
      <span className="text-[13px] font-medium text-muted">Edit</span>
    </button>
  )
}

function Block({
  title,
  body,
  error,
}: {
  title: string
  body: string
  error?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="truncate text-[15px] font-semibold">{title}</span>
      <span
        className={`text-[13px] leading-relaxed ${error ? 'text-danger' : 'text-muted'}`}
      >
        {body}
      </span>
    </div>
  )
}
