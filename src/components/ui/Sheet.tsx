import { useEffect, useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn.ts'

export interface SheetProps {
  open: boolean
  onClose: () => void
  /** Heading shown at the top of the sheet. */
  title?: string
  /** Use when there is no `title`; names the dialog for screen readers. */
  'aria-label'?: string
  className?: string
  children: ReactNode
}

/**
 * Bottom sheet with a drag handle. Closes on backdrop tap or Escape.
 * Rendered in a portal so it is never clipped by a scrolling parent.
 */
export function Sheet({
  open,
  onClose,
  title,
  className,
  children,
  ...rest
}: SheetProps) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end bg-scrim"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : rest['aria-label']}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'mx-auto flex w-full max-w-app flex-col gap-4 rounded-t-sheet bg-bg px-5 pt-3 pb-[calc(28px_+_env(safe-area-inset-bottom))] shadow-sheet',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="h-1 w-9 self-center rounded-full bg-border-strong"
        />
        {title && (
          <h2
            id={titleId}
            className="text-[22px] font-semibold tracking-[-0.02em]"
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}
