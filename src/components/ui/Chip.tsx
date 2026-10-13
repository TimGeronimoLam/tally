import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'
import { haptic } from '../../lib/haptics.ts'

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  size?: 'sm' | 'md'
}

/** Pill toggle. Selected chips invert (dark on light, light on dark). */
export function Chip({
  selected = false,
  size = 'md',
  className,
  type = 'button',
  onClick,
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      onClick={(e) => {
        haptic('tap')
        onClick?.(e)
      }}
      className={cn(
        'pressable shrink-0 rounded-full font-medium whitespace-nowrap',
        size === 'md' ? 'h-11 px-[18px] text-[15px]' : 'h-9 px-3.5 text-sm',
        selected ? 'bg-inverse text-inverse-fg' : 'bg-surface text-fg',
        className,
      )}
      {...rest}
    />
  )
}

/** Horizontally scrolling row of chips, bleeding to the screen edges. */
export function ChipRow({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1',
        className,
      )}
    >
      {children}
    </div>
  )
}
