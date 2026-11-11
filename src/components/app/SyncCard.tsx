import { useRef, useState } from 'react'
import { useDisplayName } from '../../db/index.ts'
import { useT } from '../../i18n/index.ts'
import { formatTime } from '../../lib/format.ts'
import { isSyncConfigured } from '../../lib/supabase.ts'
import { useToast } from '../../lib/toast.ts'
import {
  DISPLAY_NAME_MAX,
  ownAvatarUrl,
  removeAvatar,
  setDisplayName,
  signInWithEmail,
  signOut,
  syncNow,
  uploadAvatar,
  useSession,
  useSyncStatus,
  type EmailCodeType,
} from '../../sync/index.ts'
import {
  Avatar,
  Button,
  CameraIcon,
  Card,
  ConfirmSheet,
  InputSheet,
  Sheet,
} from '../ui/index.ts'
import { EmailCodeSheet } from './EmailCodeSheet.tsx'
import { EmailSheet } from './EmailSheet.tsx'

type SheetMode = 'closed' | 'name' | 'photo' | 'email' | 'code' | 'signOut'

/** The sign-in email just sent; the code sheet verifies against it. */
interface PendingSignIn {
  email: string
  type: EmailCodeType
}

/**
 * Account block at the top of the Account screen: the user's name, then
 * either "local only / sign in" or the signed-in email with sync status.
 * An anonymous session, created silently when joining a challenge, is
 * presented exactly like signed out; an email sign-in upgrades that user.
 */
export function SyncCard() {
  const t = useT()
  const toast = useToast()
  const { session, ready } = useSession()
  const status = useSyncStatus()
  const name = useDisplayName()
  const [sheet, setSheet] = useState<SheetMode>('closed')
  const [pending, setPending] = useState<PendingSignIn | null>(null)
  const [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  async function act(fn: () => Promise<unknown>, success?: string) {
    setBusy(true)
    try {
      await fn()
      if (success) toast({ message: success })
    } catch (err) {
      toast({
        message:
          err instanceof Error ? err.message : t.common.somethingWentWrong,
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
      ? t.sync.syncing
      : status.state === 'error'
        ? t.sync.failed(status.error ?? '')
        : status.lastSyncAt
          ? t.sync.lastSynced(formatTime(status.lastSyncAt))
          : t.sync.waitingFirst

  return (
    <>
      <Card>
        <div className="flex flex-col gap-4">
          <ProfileRow
            name={name}
            photo={email ? ownAvatarUrl(session) : null}
            onEdit={() => setSheet('name')}
            onEditPhoto={email ? () => setSheet('photo') : undefined}
          />
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
                  {t.sync.syncNow}
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1"
                  disabled={busy}
                  onClick={() => setSheet('signOut')}
                >
                  {t.sync.signOut}
                </Button>
              </div>
            </>
          ) : (
            <>
              <Block
                title={t.sync.localOnly}
                body={
                  isSyncConfigured
                    ? t.sync.localOnlyBody
                    : t.sync.notConfiguredBody
                }
              />
              {isSyncConfigured && (
                <Button
                  variant="inverse"
                  fullWidth
                  onClick={() => setSheet('email')}
                >
                  {t.sync.signInWithEmail}
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      <InputSheet
        key={`name-${sheet}`}
        open={sheet === 'name'}
        title={name ? t.sync.yourName : t.sync.addYourName}
        description={t.sync.shownToOthers}
        label={t.sync.name}
        initialValue={name}
        submitLabel={t.common.save}
        cancelLabel={t.common.cancel}
        validate={(v) =>
          v.length > 0 && v.length <= DISPLAY_NAME_MAX
            ? true
            : t.sync.nameLength(DISPLAY_NAME_MAX)
        }
        onSubmit={async (value) => {
          await setDisplayName(value)
          setSheet('closed')
        }}
        onClose={() => setSheet('closed')}
        inputProps={{
          placeholder: t.newChallenge.namePlaceholderPerson,
          autoComplete: 'nickname',
          maxLength: DISPLAY_NAME_MAX,
        }}
      />
      <Sheet
        open={sheet === 'photo'}
        onClose={() => setSheet('closed')}
        title={t.sync.photo}
      >
        <p className="text-[15px] leading-relaxed text-muted">
          {t.sync.photoShownTo}
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            // Same file again should still fire next time.
            e.target.value = ''
            if (!file) return
            setSheet('closed')
            void act(() => uploadAvatar(file), t.sync.photoSaved)
          }}
        />
        <div className="flex flex-col gap-2">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            {busy ? t.sync.saving : t.sync.choosePhoto}
          </Button>
          {ownAvatarUrl(session) && (
            <Button
              variant="ghost"
              size="md"
              fullWidth
              disabled={busy}
              className="text-danger!"
              onClick={() => {
                setSheet('closed')
                void act(removeAvatar, t.sync.photoRemoved)
              }}
            >
              {t.sync.removePhoto}
            </Button>
          )}
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => setSheet('closed')}
          >
            {t.common.cancel}
          </Button>
        </div>
      </Sheet>
      <ConfirmSheet
        open={sheet === 'signOut'}
        title={t.sync.signOutTitle}
        message={t.sync.signOutMessage}
        confirmLabel={t.sync.signOut}
        onConfirm={() => {
          setSheet('closed')
          void act(signOut, t.sync.signedOut)
        }}
        onClose={() => setSheet('closed')}
      />
      <EmailSheet
        key={`email-${sheet}`}
        open={sheet === 'email'}
        title={t.sync.signIn}
        description={t.sync.signInDescription}
        submitLabel={t.sync.sendCode}
        busyLabel={t.sync.sending}
        onSubmit={async (addr) => {
          const type = await signInWithEmail(addr)
          setPending({ email: addr, type })
          setSheet('code')
        }}
        onClose={() => setSheet('closed')}
      />
      <EmailCodeSheet
        key={`code-${sheet}-${pending?.email ?? ''}`}
        open={sheet === 'code' && pending !== null}
        pending={pending}
        onSignedIn={(addr) => {
          setSheet('closed')
          setPending(null)
          toast({ message: t.sync.signedInAs(addr) })
        }}
        onClose={() => setSheet('closed')}
      />
    </>
  )
}

function ProfileRow({
  name,
  photo,
  onEdit,
  onEditPhoto,
}: {
  name: string
  photo: string | null
  onEdit: () => void
  /** Set for email accounts: the avatar becomes its own button. */
  onEditPhoto?: () => void
}) {
  const t = useT()
  const avatar = (
    <Avatar
      initial={name || '?'}
      src={photo}
      highlight={!!name}
      className="size-10 text-[15px]"
    />
  )
  return (
    <div className="flex w-full items-center gap-3">
      {onEditPhoto ? (
        <button
          type="button"
          onClick={onEditPhoto}
          aria-label={photo ? t.sync.changePhoto : t.sync.addPhoto}
          className="pressable-dim relative shrink-0"
        >
          {avatar}
          <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border-2 border-surface bg-surface-2 text-fg">
            <CameraIcon size={11} strokeWidth={2.25} />
          </span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={onEdit}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {onEditPhoto ? null : avatar}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold">
            {name || t.sync.addYourName}
          </span>
          <span className="text-[12px] text-muted">
            {name ? t.sync.nameOnLeaderboards : t.sync.shownOnLeaderboards}
          </span>
        </span>
        <span className="text-[13px] font-medium text-muted">
          {t.common.edit}
        </span>
      </button>
    </div>
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
