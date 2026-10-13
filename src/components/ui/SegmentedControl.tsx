import { cn } from '../../lib/cn.ts'
import { haptic } from '../../lib/haptics.ts'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  /** Accessible name for the group. */
  'aria-label': string
  className?: string
}

/** iOS-style segmented toggle. Selected segment is raised on the surface. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
  ...rest
}: SegmentedControlProps<T>) {
  const md = size === 'md'
  return (
    <div
      role="group"
      aria-label={rest['aria-label']}
      className={cn(
        'flex bg-surface',
        md ? 'gap-1 rounded-control p-[3px]' : 'gap-0.5 rounded-lg p-0.5',
        className,
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (!selected) haptic('tap')
              onChange(opt.value)
            }}
            className={cn(
              'pressable-dim font-medium',
              md
                ? 'h-9 flex-1 rounded-[9px] text-sm'
                : 'h-7 rounded-md px-2.5 text-xs',
              selected ? 'bg-bg text-fg shadow-raised' : 'text-muted',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
