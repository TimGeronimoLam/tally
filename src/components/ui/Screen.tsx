import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

/**
 * Full-height column for one route. Children lay out with flex so a screen
 * can center content (Log) or stack sections (Account).
 */
export function Screen({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex min-h-full flex-col', className)}>{children}</div>
  )
}

export interface ScreenHeaderProps {
  title: string
  /** Right-aligned text, e.g. today's date or "9 of 12". */
  meta?: ReactNode
  /** Right-aligned control, e.g. a "New" button. Overrides `meta`. */
  action?: ReactNode
}

/** Title row at the top of a screen, padded under the status bar. */
export function ScreenHeader({ title, meta, action }: ScreenHeaderProps) {
  return (
    <header
      className={cn(
        'flex justify-between px-5 pt-[calc(env(safe-area-inset-top)_+_16px)]',
        action ? 'items-center' : 'items-baseline',
      )}
    >
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>
      {action ?? (meta && <span className="text-sm text-muted">{meta}</span>)}
    </header>
  )
}

/** Horizontal padding matching the screen gutter. */
export function Gutter({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn('px-5', className)}>{children}</div>
}
