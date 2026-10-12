import { InputSheet } from '../ui/index.ts'

export interface EmailSheetProps {
  open: boolean
  title: string
  description: string
  submitLabel: string
  onSubmit: (email: string) => Promise<void>
  onClose: () => void
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Collects an email address for magic-link sign-in. */
export function EmailSheet({ onSubmit, ...rest }: EmailSheetProps) {
  return (
    <InputSheet
      {...rest}
      label="Email"
      validate={(v) => EMAIL.test(v) || 'Enter a valid email address'}
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
