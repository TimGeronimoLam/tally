import type { ReactNode } from 'react'
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

/** Yes/no bottom sheet for actions that deserve a second look. */
export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  destructive,
  onConfirm,
  onClose,
}: ConfirmSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-[15px] leading-relaxed text-muted">{message}</p>
      <div className="flex flex-col gap-2">
        <Button
          variant={destructive ? 'inverse' : 'primary'}
          size="lg"
          fullWidth
          onClick={onConfirm}
          className={destructive ? 'bg-danger text-white' : undefined}
        >
          {confirmLabel}
        </Button>
        <Button variant="ghost" size="md" fullWidth onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Sheet>
  )
}
