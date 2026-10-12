import { useCallback, useEffect, useState } from 'react'
import type { KeypadKey } from './Keypad.tsx'

export interface NumericKeypadOptions {
  maxDigits?: number
  /** Also accept digits / Backspace from a physical keyboard. */
  keyboard?: boolean
  /** Called on Enter when `keyboard` is on. */
  onSubmit?: () => void
}

/** State for a Keypad: the digit string being entered plus press/clear. */
export function useNumericKeypad({
  maxDigits = 4,
  keyboard = false,
  onSubmit,
}: NumericKeypadOptions = {}) {
  const [value, setValue] = useState('')

  const press = useCallback(
    (key: KeypadKey) => {
      setValue((v) => {
        if (key === 'delete') return v.slice(0, -1)
        if (v.length >= maxDigits) return v
        return v === '0' ? key : v + key
      })
    },
    [maxDigits],
  )

  const clear = useCallback(() => setValue(''), [])

  useEffect(() => {
    if (!keyboard) return
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (/^[0-9]$/.test(e.key)) press(e.key as KeypadKey)
      else if (e.key === 'Backspace') press('delete')
      else if (e.key === 'Enter') onSubmit?.()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [keyboard, press, onSubmit])

  return { value, number: Number(value || '0'), press, clear }
}
