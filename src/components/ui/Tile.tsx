import type { ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'

export interface TileProps {
  label: string
  value: ReactNode
  /** Small suffix after the value, e.g. "days". */
  unit?: string
  /** Outlined in accent instead of filled, for the headline number. */
  emphasis?: boolean
  className?: string
}

/** Compact stat tile: small label over a large number. */
export function Tile({ label, value, unit, emphasis, className }: TileProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 rounded-control p-3',
        emphasis ? 'border-[1.5px] border-accent' : 'bg-surface',
        className,
      )}
    >
      <span className="text-[11px] text-muted">{label}</span>
      <span
        className={cn(
          'text-2xl font-semibold tracking-[-0.02em]',
          emphasis && 'text-accent-text',
        )}
      >
        {value}
        {unit && <span className="ml-1 text-xs font-medium">{unit}</span>}
      </span>
    </div>
  )
}

/** Three-column grid of tiles. */
export function TileGrid({
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
