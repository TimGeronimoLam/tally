import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

/** Uppercase section heading used between groups on a screen. */
export function SectionLabel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <h2
      className={cn(
        'pt-6 pb-1.5 text-xs font-semibold tracking-[0.06em] text-muted uppercase',
        className,
      )}
    >
      {children}
    </h2>
  )
}
