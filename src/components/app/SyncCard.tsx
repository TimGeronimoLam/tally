import { useState } from 'react'
import { formatTime } from '../../lib/format.ts'
import { isSyncConfigured } from '../../lib/supabase.ts'
import { useToast } from '../../lib/toast.ts'
import {
  addEmail,
  signInAnonymously,
  signInWithEmail,
  signOut,
  syncNow,
  useSession,
  useSyncStatus,
} from '../../sync/index.ts'
import { Button, Card } from '../ui/index.ts'
import { EmailSheet } from './EmailSheet.tsx'

type SheetMode = 'closed' | 'add-email' | 'sign-in'

/**
 * The account block at the top of the Account screen. Three states:
 * signed out (local only), anonymous (syncing, no email yet), and
 * signed in with an email.
 */
export function SyncCard() {
  const toast = useToast()
  const { session, ready } = useSession()
  const status = useSyncStatus()
  const [sheet, setSheet] = useState<SheetMode>('closed')
  const [busy, setBusy] = useState(false)

  async function act(fn: () => Promise<void>, success?: string) {
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

  if (!isSyncConfigured) {
    return (
      <Card>
        <Block
          title="Local only"
          body="Your data lives on this device. Sync is not configured in this build."
        />
      </Card>
    )
  }

  if (!ready) return <Card className="h-[140px]" />

  const user = session?.user
  const email = user?.email
  const anonymous = !!user && (user.is_anonymous ?? !email)

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
        <div className="flex flex-col gap-3">
          {!user && (
            <>
              <Block
                title="Local only"
                body="Your data lives on this device. Sign in to back it up and sync across phones."
              />
              <Button
                variant="inverse"
                fullWidth
                disabled={busy}
                onClick={() =>
                  act(signInAnonymously, 'Sync is on. Add an email to keep it.')
                }
              >
                Sign in to sync
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setSheet('sign-in')}
              >
                I already have an account
              </Button>
            </>
          )}

          {user && anonymous && (
            <>
              <Block
                title="Syncing"
                body={`Anonymous account on this phone. ${syncLine}.`}
                error={status.state === 'error'}
              />
              <Button
                variant="inverse"
                fullWidth
                onClick={() => setSheet('add-email')}
              >
                Add email to keep your account
              </Button>
              <SecondaryRow
                busy={busy}
                onSync={() => act(() => syncNow().then(() => {}))}
                onSignOut={() =>
                  act(signOut, 'Signed out. Your data stays on this phone.')
                }
              />
            </>
          )}

          {user && !anonymous && (
            <>
              <Block
                title={email ?? 'Signed in'}
                body={syncLine}
                error={status.state === 'error'}
              />
              <SecondaryRow
                busy={busy}
                onSync={() => act(() => syncNow().then(() => {}))}
                onSignOut={() =>
                  act(signOut, 'Signed out. Your data stays on this phone.')
                }
              />
            </>
          )}
        </div>
      </Card>

      <EmailSheet
        key={sheet}
        open={sheet === 'add-email'}
        title="Keep your account"
        description="We'll email you a confirmation link. After that this account, with everything synced so far, is yours on any phone."
        submitLabel="Send confirmation"
        onSubmit={async (addr) => {
          await addEmail(addr)
          setSheet('closed')
          toast({ message: `Confirmation sent to ${addr}` })
        }}
        onClose={() => setSheet('closed')}
      />
      <EmailSheet
        key={`${sheet}-in`}
        open={sheet === 'sign-in'}
        title="Sign in"
        description="Enter the email on your account and we'll send a sign-in link."
        submitLabel="Send sign-in link"
        onSubmit={async (addr) => {
          await signInWithEmail(addr)
          setSheet('closed')
          toast({ message: `Sign-in link sent to ${addr}` })
        }}
        onClose={() => setSheet('closed')}
      />
    </>
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

function SecondaryRow({
  busy,
  onSync,
  onSignOut,
}: {
  busy: boolean
  onSync: () => void
  onSignOut: () => void
}) {
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="flex-1"
        disabled={busy}
        onClick={onSync}
      >
        Sync now
      </Button>
      <Button
        variant="ghost"
        className="flex-1"
        disabled={busy}
        onClick={onSignOut}
      >
        Sign out
      </Button>
    </div>
  )
}
