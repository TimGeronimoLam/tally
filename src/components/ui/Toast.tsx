import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { useT } from '../../i18n/index.ts'
import { ToastContext, type ToastOptions } from '../../lib/toast.ts'
import { CloseIcon } from './icons.tsx'

interface ToastState extends ToastOptions {
  id: number
}

let nextId = 1

/** Reading time: 4 s minimum, plus ~50 ms per character beyond a short line. */
function durationFor(message: string) {
  return Math.max(4000, 2000 + message.length * 50)
}

/**
 * Toast slot above the tab bar. Show one with `useToast()` from
 * src/lib/toast.ts. By default a new toast replaces the one on screen;
 * `queue: true` lines it up behind instead (used for achievement unlocks
 * so they never hide the Undo of the log that earned them).
 *
 * Long messages wrap. Each toast can be dismissed with its close button or
 * swiped sideways; the auto-dismiss timer pauses while a finger is on it.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastState[]>([])
  const current = queue[0]

  const show = useCallback((opts: ToastOptions) => {
    const toast = { ...opts, id: nextId++ }
    setQueue((q) => (opts.queue ? [...q, toast] : [toast, ...q.slice(1)]))
  }, [])

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {current && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(62px_+_env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-app px-5"
        >
          <Toast key={current.id} toast={current} onDismiss={dismiss} />
        </div>
      )}
    </ToastContext.Provider>
  )
}

/** Horizontal travel (px) or release speed (px/ms) that counts as a fling. */
const FLING_DISTANCE = 72
const FLING_VELOCITY = 0.5
const EXIT_MS = 160

type Drag = { x: number; dx: number; t: number; v: number } | null

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState
  onDismiss: () => void
}) {
  const t = useT()
  const [drag, setDrag] = useState<Drag>(null)
  const [exit, setExit] = useState<-1 | 1 | 0>(0)
  const exiting = exit !== 0
  const paused = drag !== null || exiting

  // Auto-dismiss, paused while the toast is being dragged.
  useEffect(() => {
    if (paused) return
    const t = window.setTimeout(
      onDismiss,
      toast.duration ?? durationFor(toast.message),
    )
    return () => window.clearTimeout(t)
  }, [paused, toast, onDismiss])

  const fling = useCallback(
    (dir: -1 | 1) => {
      setDrag(null)
      setExit(dir)
      window.setTimeout(onDismiss, EXIT_MS)
    },
    [onDismiss],
  )

  const lastMove = useRef({ x: 0, t: 0 })

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (exiting || (e.target as HTMLElement).closest('button')) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Not a live pointer (synthetic event); dragging still works unless
      // the pointer leaves the element.
    }
    lastMove.current = { x: e.clientX, t: e.timeStamp }
    setDrag({ x: e.clientX, dx: 0, t: e.timeStamp, v: 0 })
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return
    const dt = Math.max(1, e.timeStamp - lastMove.current.t)
    const v = (e.clientX - lastMove.current.x) / dt
    lastMove.current = { x: e.clientX, t: e.timeStamp }
    setDrag({ ...drag, dx: e.clientX - drag.x, v })
  }

  function onPointerUp() {
    if (!drag) return
    const far = Math.abs(drag.dx) > FLING_DISTANCE
    const fast = Math.abs(drag.v) > FLING_VELOCITY
    if (far || fast) fling(drag.dx < 0 || (fast && drag.v < 0) ? -1 : 1)
    else setDrag(null)
  }

  const dx = exit ? exit * 480 : (drag?.dx ?? 0)
  const opacity = exit ? 0 : Math.max(0.3, 1 - Math.abs(dx) / 240)

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
      className="pointer-events-auto flex min-h-[52px] touch-pan-y items-center gap-1 rounded-control bg-inverse py-2 pr-1.5 pl-4 text-[15px] text-inverse-fg shadow-toast select-none"
      style={{
        transform: `translateX(${dx}px)`,
        opacity,
        transition: drag
          ? 'none'
          : `transform ${EXIT_MS}ms ease-out, opacity ${EXIT_MS}ms ease-out`,
      }}
    >
      <span className="min-w-0 flex-1 py-1 leading-snug break-words">
        {toast.message}
      </span>
      {toast.action && (
        <button
          type="button"
          className="h-9 shrink-0 rounded-lg px-3 font-semibold text-accent-on-inverse"
          onClick={() => {
            toast.action?.onClick()
            onDismiss()
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label={t.common.dismiss}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-inverse-fg"
        onClick={onDismiss}
      >
        <CloseIcon size={18} />
      </button>
    </div>
  )
}
