import { cn } from '../../lib/cn.ts'

export interface ProgressBarProps {
  value: number
  max: number
  'aria-label': string
  className?: string
}

/** Thin accent progress track. */
export function ProgressBar({
  value,
  max,
  className,
  ...rest
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={rest['aria-label']}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn('h-1.5 overflow-hidden rounded-full bg-border', className)}
    >
      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
    </div>
  )
}
