import { useEffect, useId, useRef, type ReactNode } from 'react'
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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Bottom sheet with a drag handle. Closes on backdrop tap or Escape.
 * Rendered in a portal so it is never clipped by a scrolling parent.
 *
 * While open, the app behind it is `inert` (no focus, hidden from screen
 * readers), focus moves into the sheet, and goes back to the opener on
 * close.
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
  const dialog = useRef<HTMLDivElement>(null)
  // Captured while rendering the opening frame: by the time any effect
  // (even a layout effect) runs, an `autoFocus` field inside the sheet has
  // already taken focus. The refs never influence rendered output.
  const opener = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  /* oxlint-disable react/refs -- see above */
  if (open && !wasOpen.current) {
    opener.current = document.activeElement as HTMLElement | null
  }
  wasOpen.current = open
  /* oxlint-enable react/refs */

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const root = document.getElementById('root')
    if (root) root.inert = true

    const el = dialog.current
    if (el && !el.contains(document.activeElement)) {
      const first =
        el.querySelector<HTMLElement>('[autofocus]') ??
        el.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? el).focus()
    }

    return () => {
      if (root) root.inert = false
      opener.current?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end bg-scrim"
      onClick={onClose}
    >
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : rest['aria-label']}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'mx-auto flex w-full max-w-app flex-col gap-4 rounded-t-sheet bg-bg px-5 pt-3 pb-[calc(28px_+_env(safe-area-inset-bottom))] shadow-sheet outline-none',
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
