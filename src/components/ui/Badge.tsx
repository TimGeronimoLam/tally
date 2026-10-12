import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export interface BadgeProps {
  /** Short text ("1k") or an icon element for the medallion. */
  icon: ReactNode
  title: string
  caption?: string
  unlocked: boolean
  /** Accent medallion for the newest/most notable unlock. */
  highlight?: boolean
}

/** Achievement badge card. Locked badges are greyed out. */
export function Badge({
  icon,
  title,
  caption,
  unlocked,
  highlight,
}: BadgeProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-card px-2 pt-3.5 pb-3 text-center',
        unlocked ? 'bg-surface text-fg' : 'bg-surface-faint text-disabled',
      )}
    >
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-full text-[15px] font-semibold tracking-[-0.02em]',
          !unlocked && 'bg-surface-2 text-disabled',
          unlocked && !highlight && 'bg-inverse text-inverse-fg',
          unlocked && highlight && 'bg-accent text-accent-fg',
        )}
      >
        {icon}
      </span>
      <span className="text-[13px] font-semibold">{title}</span>
      {caption && (
        <span
          className={cn(
            'text-[11px]',
            unlocked ? 'text-muted' : 'text-disabled',
          )}
        >
          {caption}
        </span>
      )}
    </div>
  )
}

/** Three-column grid of badges. */
export function BadgeGrid({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('grid grid-cols-3 gap-2', className)}>{children}</div>
  )
}
