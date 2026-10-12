import { isIOS, isStandalone } from '../../lib/install.ts'
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
 * Second step of email sign-in: the one-time code from the email. The
 * email's link signs in too, but on an iPhone it opens Safari rather than
 * the installed app, and the two do not share a session, so inside the
 * app the code is the only way in. Mount with a changing `key` per send.
 */
export function EmailCodeSheet({
  open,
  pending,
  onSignedIn,
  onClose,
}: EmailCodeSheetProps) {
  const inApp = isStandalone()
  const description = pending
    ? `We sent a code to ${pending.email}. Enter it here${
        inApp && isIOS()
          ? '. The link in the email opens Safari, not this app, so use the code.'
          : ', or tap the link in the email.'
      }`
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
