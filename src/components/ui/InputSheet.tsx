import { useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { useT } from '../../i18n/index.ts'
import { Button } from './Button.tsx'
import { Sheet } from './Sheet.tsx'
import { TextField } from './TextField.tsx'

export interface InputSheetProps {
  open: boolean
  title: string
  description?: string
  label: string
  initialValue?: string
  submitLabel: string
  /** Shown on the submit button while `onSubmit` runs. */
  busyLabel?: string
  cancelLabel?: string
  /** Return false (or a message) to block submit. Trimmed value. */
  validate?: (value: string) => boolean | string
  /** Throw to show an error under the field. */
  onSubmit: (value: string) => Promise<void> | void
  onClose: () => void
  inputProps?: InputHTMLAttributes<HTMLInputElement>
}

/**
 * Bottom sheet asking for one text value. Mount with a changing `key` to
 * reset its state between uses.
 */
export function InputSheet({
  open,
  title,
  description,
  label,
  initialValue = '',
  submitLabel,
  busyLabel,
  cancelLabel,
  validate,
  onSubmit,
  onClose,
  inputProps,
}: InputSheetProps) {
  const t = useT()
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmed = value.trim()
  const verdict = validate ? validate(trimmed) : trimmed.length > 0
  const valid = verdict === true

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.somethingWentWrong)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {description && (
          <p className="text-[13px] leading-relaxed text-muted">
            {description}
          </p>
        )}
        <TextField
          label={label}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          {...inputProps}
        />
        {(error ??
          (typeof verdict === 'string' && trimmed ? verdict : null)) && (
          <p className="text-[13px] text-danger">
            {error ?? (verdict as string)}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" fullWidth disabled={!valid || busy}>
            {busy ? (busyLabel ?? t.sync.saving) : submitLabel}
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            {cancelLabel ?? t.common.notNow}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
