import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { ToastContext, type ToastOptions } from '../../lib/toast.ts'

interface ToastState extends ToastOptions {
  id: number
}

let nextId = 1

/**
 * Toast slot above the tab bar. Show one with `useToast()` from
 * src/lib/toast.ts. By default a new toast replaces the one on screen;
 * `queue: true` lines it up behind instead (used for achievement unlocks
 * so they never hide the Undo of the log that earned them).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<ToastState[]>([])
  const current = queue[0]

  const show = useCallback((opts: ToastOptions) => {
    const toast = { ...opts, id: nextId++ }
    setQueue((q) => (opts.queue ? [...q, toast] : [toast, ...q.slice(1)]))
  }, [])

  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), [])

  useEffect(() => {
    if (!current) return
    const t = window.setTimeout(dismiss, current.duration ?? 4000)
    return () => window.clearTimeout(t)
  }, [current, dismiss])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {current && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(76px_+_env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-app px-5"
        >
          <div className="pointer-events-auto flex h-[52px] items-center justify-between rounded-control bg-inverse pr-2 pl-4 text-[15px] text-inverse-fg shadow-toast">
            <span className="truncate">{current.message}</span>
            {current.action && (
              <button
                type="button"
                className="h-9 shrink-0 rounded-lg px-3 font-semibold text-accent-on-inverse"
                onClick={() => {
                  current.action?.onClick()
                  dismiss()
                }}
              >
                {current.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
