import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  action?: { label: string; onClick: () => void }
  /** ms before auto-dismiss */
  duration?: number
  /**
   * Wait behind the toast currently showing instead of replacing it.
   * Use for celebrations; feedback for a tap should replace.
   */
  queue?: boolean
}

export const ToastContext = createContext<(opts: ToastOptions) => void>(
  () => {},
)

export function useToast() {
  return useContext(ToastContext)
}
