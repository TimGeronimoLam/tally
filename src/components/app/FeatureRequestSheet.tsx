import { useId, useState, type FormEvent } from 'react'
import { useLocale, useT } from '../../i18n/index.ts'
import { cn } from '../../lib/cn.ts'
import { sendFeatureRequest } from '../../lib/featureRequest.ts'
import { Button, Sheet, TextField } from '../ui/index.ts'
import { inputClassName } from '../ui/TextField.tsx'

/** Matches worker/feature-request.ts MAX_MESSAGE. */
const MAX_MESSAGE = 4000
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface FeatureRequestSheetProps {
  open: boolean
  /** Prefills the reply address, e.g. the signed-in email. */
  defaultEmail?: string
  onSent: () => void
  onClose: () => void
}

/**
 * "Request a feature": a free-text idea and an optional reply address,
 * mailed to the developer. Mount with a changing `key` to reset it.
 */
export function FeatureRequestSheet({
  open,
  defaultEmail = '',
  onSent,
  onClose,
}: FeatureRequestSheetProps) {
  const t = useT()
  const locale = useLocale()
  const messageId = useId()
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(defaultEmail)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmedEmail = email.trim()
  const emailInvalid = trimmedEmail !== '' && !EMAIL.test(trimmedEmail)
  const valid = message.trim() !== '' && !emailInvalid

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await sendFeatureRequest({
        message: message.trim(),
        email: trimmedEmail || undefined,
        lang: locale,
      })
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.somethingWentWrong)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.account.requestFeature}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-[13px] leading-relaxed text-muted">
          {t.account.featureDescription}
        </p>
        <div className="flex flex-col gap-2">
          <label htmlFor={messageId} className="text-[13px] font-medium">
            {t.account.featureIdea}
          </label>
          <textarea
            id={messageId}
            autoFocus
            rows={5}
            maxLength={MAX_MESSAGE}
            value={message}
            placeholder={t.account.featurePlaceholder}
            onChange={(e) => setMessage(e.target.value)}
            className={cn(
              inputClassName.replace('h-[52px]', ''),
              'resize-none py-3 leading-snug',
            )}
          />
        </div>
        <TextField
          label={t.account.featureEmail}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {(error ?? (emailInvalid ? t.sync.emailInvalid : null)) && (
          <p className="text-[13px] text-danger">
            {error ?? t.sync.emailInvalid}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <Button type="submit" size="lg" fullWidth disabled={!valid || busy}>
            {busy ? t.sync.sending : t.account.featureSend}
          </Button>
          <Button variant="ghost" fullWidth onClick={onClose}>
            {t.common.notNow}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
