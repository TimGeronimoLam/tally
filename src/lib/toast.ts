import { createContext, useContext } from 'react'

export interface ToastOptions {
  message: string
  action?: { label: string; onClick: () => void }
  /** ms before auto-dismiss */
  duration?: number
}

export const ToastContext = createContext<(opts: ToastOptions) => void>(
  () => {},
)

export function useToast() {
  return useContext(ToastContext)
}
