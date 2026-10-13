import {
  normalizeEmailCode,
  verifyEmailCode,
  type EmailCodeType,
} from '../../sync/index.ts'
import { InputSheet } from '../ui/index.ts'

export interface EmailCodeSheetProps {
  open: boolean
  /** The email just sent; null while nothing is pending. */
  pending: { email: string; type: EmailCodeType } | null
  onSignedIn: (email: string) => void
  onClose: () => void
}

/**
 * Second step of email sign-in: the one-time code from the email. The email
 * carries only the code (no link: on an iPhone a link opens Safari rather
 * than the installed app, and the two do not share a session). Mount with
 * a changing `key` per send.
 */
export function EmailCodeSheet({
  open,
  pending,
  onSignedIn,
  onClose,
}: EmailCodeSheetProps) {
  const description = pending
    ? `We sent a code to ${pending.email}. Enter it here.`
    : ''

  return (
    <InputSheet
      open={open}
      title="Enter your code"
      description={description}
      label="Code"
      submitLabel="Sign in"
      busyLabel="Signing in…"
      cancelLabel="Cancel"
      validate={(v) =>
        normalizeEmailCode(v).length >= 6 ||
        'Enter the whole code from the email'
      }
      onSubmit={async (code) => {
        if (!pending) return
        await verifyEmailCode(pending.email, code, pending.type)
        onSignedIn(pending.email)
      }}
      onClose={onClose}
      inputProps={{
        inputMode: 'numeric',
        autoComplete: 'one-time-code',
        placeholder: '123456',
        maxLength: 12,
      }}
    />
  )
}
