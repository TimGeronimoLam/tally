import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
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

/** Controls that own their own pointer gestures; a drag never starts on them. */
const NO_DRAG = 'button, a, input, select, textarea, label'

/** How long the closing transition runs before the sheet unmounts. */
const CLOSE_MS = 220
/** Downward travel (px) or release speed (px/ms) that dismisses. */
const DISMISS_DISTANCE = 120
const DISMISS_VELOCITY = 0.5

type Phase = 'closed' | 'open' | 'closing'
type Drag = { startY: number; dy: number; v: number } | null

/**
 * Bottom sheet with a drag handle. Slides up on open; closes on backdrop
 * tap, Escape, or dragging it down. Rendered in a portal so it is never
 * clipped by a scrolling parent.
 *
 * While open, the app behind it is `inert` (no focus, hidden from screen
 * readers), focus moves into the sheet, and goes back to the opener on
 * close. The sheet stays mounted for the closing animation.
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
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed')
  const [drag, setDrag] = useState<Drag>(null)

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

  // Mount on open; on close, play the exit transition, then unmount.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    setPhase(open ? 'open' : 'closing')
    if (!open) setDrag(null)
  }
  useEffect(() => {
    if (phase !== 'closing') return
    const t = window.setTimeout(() => setPhase('closed'), CLOSE_MS)
    return () => window.clearTimeout(t)
  }, [phase])

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

  // Drag to dismiss: anywhere on the sheet that is not a control.
  const lastMove = useRef({ y: 0, t: 0 })

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!open || e.button !== 0) return
      if ((e.target as HTMLElement).closest(NO_DRAG)) return
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // Synthetic event; dragging still works unless the pointer leaves.
      }
      lastMove.current = { y: e.clientY, t: e.timeStamp }
      setDrag({ startY: e.clientY, dy: 0, v: 0 })
    },
    [open],
  )

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return
    const dt = Math.max(1, e.timeStamp - lastMove.current.t)
    const v = (e.clientY - lastMove.current.y) / dt
    lastMove.current = { y: e.clientY, t: e.timeStamp }
    // Pulling up resists, like a native sheet at its top.
    const raw = e.clientY - drag.startY
    const dy = raw < 0 ? raw / 4 : raw
    setDrag({ ...drag, dy, v })
  }

  function onPointerUp() {
    if (!drag) return
    const far = drag.dy > DISMISS_DISTANCE
    const fast = drag.v > DISMISS_VELOCITY && drag.dy > 0
    if (far || fast) onClose()
    else setDrag(null)
  }

  if (phase === 'closed') return null
  const closing = phase === 'closing'

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-40 flex items-end bg-scrim',
        'animate-[scrim-in_200ms_ease-out] transition-opacity duration-200',
        closing && 'opacity-0',
      )}
      style={{
        // Fade the scrim with the drag so the app shows through.
        opacity: drag ? Math.max(0.2, 1 - drag.dy / 600) : undefined,
      }}
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        className={cn(
          'relative mx-auto flex w-full max-w-app touch-pan-x flex-col gap-4 rounded-t-sheet bg-bg px-5 pt-3 pb-[calc(28px_+_env(safe-area-inset-bottom))] shadow-sheet outline-none',
          // Extends below the screen so dragging up reveals sheet, not scrim.
          'after:absolute after:inset-x-0 after:top-full after:h-[50vh] after:bg-bg',
          'animate-[sheet-in_320ms_cubic-bezier(0.32,0.72,0,1)]',
          className,
        )}
        style={{
          transform: closing
            ? 'translateY(100%)'
            : drag
              ? `translateY(${drag.dy}px)`
              : undefined,
          transition: drag
            ? 'none'
            : `transform ${CLOSE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        }}
      >
        {/* Handle: a taller hit area than the pill it draws. */}
        <span
          aria-hidden="true"
          className="-my-3 flex h-7 shrink-0 cursor-grab items-center justify-center"
        >
          <span className="h-1 w-9 rounded-full bg-border-strong" />
        </span>
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
