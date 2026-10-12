import { useState } from 'react'
import { formatTime } from '../../lib/format.ts'
import { isSyncConfigured } from '../../lib/supabase.ts'
import { useToast } from '../../lib/toast.ts'
import {
  signInWithEmail,
  signOut,
  syncNow,
  useSession,
  useSyncStatus,
} from '../../sync/index.ts'
import { Button, Card } from '../ui/index.ts'
import { EmailSheet } from './EmailSheet.tsx'

/**
 * Account block at the top of the Account screen. Two visible states:
 * signed out (local only) and signed in with an email. An anonymous
 * session, created silently when joining a challenge, is presented exactly
 * like signed out; signing in with an email then upgrades that same user.
 */
export function SyncCard() {
  const toast = useToast()
  const { session, ready } = useSession()
  const status = useSyncStatus()
  const [sheetOpen, setSheetOpen] = useState(false)
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

  if (!ready) return <Card className="h-[120px]" />

  const user = session?.user
  const email = user && !user.is_anonymous ? user.email : undefined

  if (!email) {
    return (
      <>
        <Card>
          <div className="flex flex-col gap-3">
            <Block
              title="Local only"
              body="Your data lives on this device. Sign in to back it up and sync across phones."
            />
            <Button
              variant="inverse"
              fullWidth
              onClick={() => setSheetOpen(true)}
            >
              Sign in with email
            </Button>
          </div>
        </Card>
        <EmailSheet
          key={String(sheetOpen)}
          open={sheetOpen}
          title="Sign in"
          description="We'll email you a sign-in link. No password needed; the same link creates your account the first time."
          submitLabel="Send link"
          onSubmit={async (addr) => {
            await signInWithEmail(addr)
            setSheetOpen(false)
            toast({ message: `Link sent to ${addr}` })
          }}
          onClose={() => setSheetOpen(false)}
        />
      </>
    )
  }

  const syncLine =
    status.state === 'syncing'
      ? 'Syncing…'
      : status.state === 'error'
        ? `Sync failed: ${status.error}`
        : status.lastSyncAt
          ? `Last synced ${formatTime(status.lastSyncAt)}`
          : 'Waiting for first sync'

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <Block title={email} body={syncLine} error={status.state === 'error'} />
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
      </div>
    </Card>
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
