import { useState, type FormEvent } from 'react'
import { Button, Sheet, TextField } from '../ui/index.ts'

export interface EmailSheetProps {
  open: boolean
  title: string
  description: string
  submitLabel: string
  onSubmit: (email: string) => Promise<void>
  onClose: () => void
}

/** Collects an email address for magic-link sign-in or account linking. */
export function EmailSheet({
  open,
  title,
  description,
  submitLabel,
  onSubmit,
  onClose,
}: EmailSheetProps) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(email.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-[13px] leading-relaxed text-muted">{description}</p>
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" fullWidth disabled={!valid || busy}>
            {busy ? 'Sending…' : submitLabel}
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            Not now
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
