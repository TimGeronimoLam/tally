import { useT } from '../../i18n/index.ts'
import { cn } from '../../lib/cn.ts'
import { haptic } from '../../lib/haptics.ts'
import { BackspaceIcon } from './icons.tsx'

export type KeypadKey =
  '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'delete'

const LAYOUT: Array<KeypadKey | null> = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  null,
  '0',
  'delete',
]

export interface KeypadProps {
  onKey: (key: KeypadKey) => void
  disabled?: boolean
  className?: string
}

/** 3×4 numeric keypad. */
export function Keypad({ onKey, disabled, className }: KeypadProps) {
  const t = useT()
  function press(key: KeypadKey) {
    if (disabled) return
    haptic('tap')
    onKey(key)
  }
  return (
    <div className={cn('grid grid-cols-3 gap-1.5', className)}>
      {LAYOUT.map((key, i) =>
        key === null ? (
          <div key={`blank-${i}`} aria-hidden="true" />
        ) : (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-label={key === 'delete' ? t.log.keypadDelete : undefined}
            // Act on finger-down like a native keypad. Android Chrome turns
            // a long press into a context-menu gesture and never sends the
            // click, so a held key would otherwise be lost. Keyboard
            // activation (Enter/Space) arrives as a click with detail 0.
            onPointerDown={(e) => {
              if (e.button !== 0) return
              press(key)
            }}
            onClick={(e) => {
              if (e.detail === 0) press(key)
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="pressable flex h-[54px] items-center justify-center rounded-control bg-surface text-[26px] text-fg active:bg-surface-2 disabled:opacity-40"
          >
            {key === 'delete' ? (
              <BackspaceIcon size={30} strokeWidth={1.8} />
            ) : (
              key
            )}
          </button>
        ),
      )}
    </div>
  )
}
