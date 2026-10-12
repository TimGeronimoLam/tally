import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastOptions } from '../../lib/toast.ts'

interface ToastState extends ToastOptions {
  id: number
}

/**
 * Single-slot toast above the tab bar. Show one with `useToast()` from
 * src/lib/toast.ts. A new toast replaces the current one.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((opts: ToastOptions) => {
    window.clearTimeout(timer.current)
    const id = Date.now()
    setToast({ ...opts, id })
    timer.current = window.setTimeout(
      () => setToast((t) => (t?.id === id ? null : t)),
      opts.duration ?? 4000,
    )
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-5 bottom-[calc(76px_+_env(safe-area-inset-bottom))] z-30"
        >
          <div className="pointer-events-auto flex h-[52px] items-center justify-between rounded-control bg-inverse pr-2 pl-4 text-[15px] text-inverse-fg shadow-toast">
            <span className="truncate">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="h-9 shrink-0 rounded-lg px-3 font-semibold text-accent-on-inverse"
                onClick={() => {
                  toast.action?.onClick()
                  setToast(null)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}
