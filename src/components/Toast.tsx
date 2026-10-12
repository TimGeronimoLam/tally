import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastOptions } from '../lib/toast.ts'

interface ToastState extends ToastOptions {
  id: number
}

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
          className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
        >
          <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-900 shadow-lg">
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="font-semibold text-green-700 uppercase"
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
