import { cn } from '../../lib/cn.ts'
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
            aria-label={key === 'delete' ? 'Delete' : undefined}
            onClick={() => onKey(key)}
            className="flex h-[54px] items-center justify-center rounded-control bg-surface text-[26px] text-fg active:bg-surface-2 disabled:opacity-40"
          >
            {key === 'delete' ? <BackspaceIcon size={26} /> : key}
          </button>
        ),
      )}
    </div>
  )
}
