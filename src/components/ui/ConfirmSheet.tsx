import type { ReactNode } from 'react'
import { useT } from '../../i18n/index.ts'
import { Button } from './Button.tsx'
import { Sheet } from './Sheet.tsx'

export interface ConfirmSheetProps {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  /** Red confirm button for destructive actions. */
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}

/**
 * Yes/no bottom sheet for actions that deserve a second look. Destructive
 * confirms start with focus on Cancel, so Enter twice never deletes.
 */
export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  const t = useT()
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-[15px] leading-relaxed text-muted">{message}</p>
      <div className="flex flex-col gap-2">
        <Button
          variant={destructive ? 'destructive' : 'primary'}
          size="lg"
          fullWidth
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          autoFocus={destructive}
          onClick={onClose}
        >
          {t.common.cancel}
        </Button>
      </div>
    </Sheet>
  )
}
