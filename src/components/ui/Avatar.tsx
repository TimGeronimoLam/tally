import { cn } from '../../lib/cn.ts'

export interface AvatarProps {
  /** Usually the first letter of a display name. */
  initial: string
  /** Accent fill, used for the current user. */
  highlight?: boolean
  className?: string
}

/** 32px initial avatar for leaderboards. */
export function Avatar({ initial, highlight, className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold',
        highlight ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg',
        className,
      )}
    >
      {initial.slice(0, 1).toUpperCase()}
    </span>
  )
}
