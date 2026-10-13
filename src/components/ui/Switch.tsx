import { cn } from '../../lib/cn.ts'
import { haptic } from '../../lib/haptics.ts'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  /** Accessible name; usually the row's visible label. */
  'aria-label': string
  className?: string
}

/** iOS-style on/off switch. The 31px track sits in a 44px hit area. */
export function Switch({
  checked,
  onChange,
  disabled,
  className,
  ...rest
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => {
        haptic('tap')
        onChange(!checked)
      }}
      className={cn(
        '-mx-1.5 flex h-11 shrink-0 items-center px-1.5 disabled:opacity-40',
        className,
      )}
    >
      <span
        className={cn(
          'relative h-[31px] w-[51px] rounded-full transition-colors duration-200',
          checked ? 'bg-accent' : 'bg-border-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] left-[2px] size-[27px] rounded-full bg-accent-fg shadow-raised transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  )
}
