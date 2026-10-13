import { useT } from '../../i18n/index.ts'
import { InputSheet } from '../ui/index.ts'

export interface EmailSheetProps {
  open: boolean
  title: string
  description: string
  submitLabel: string
  busyLabel?: string
  onSubmit: (email: string) => Promise<void>
  onClose: () => void
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Collects an email address for code sign-in. */
export function EmailSheet({ onSubmit, ...rest }: EmailSheetProps) {
  const t = useT()
  return (
    <InputSheet
      {...rest}
      label={t.sync.email}
      validate={(v) => EMAIL.test(v) || t.sync.emailInvalid}
      onSubmit={onSubmit}
      inputProps={{
        type: 'email',
        inputMode: 'email',
        autoComplete: 'email',
        placeholder: 'you@example.com',
      }}
    />
  )
}
