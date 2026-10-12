import { cn } from '../../lib/cn.ts'

export interface Bar {
  label: string
  value: number
  /** Accent fill; used for the latest bar. */
  highlight?: boolean
}

export interface BarChartProps {
  bars: Bar[]
  /** Pixel height of the tallest bar. */
  height?: number
  'aria-label': string
  className?: string
}

/** Plain-div bar chart. Heights are relative to the largest value. */
export function BarChart({
  bars,
  height = 60,
  className,
  ...rest
}: BarChartProps) {
  const max = Math.max(1, ...bars.map((b) => b.value))
  const dense = bars.length > 7
  return (
    <div
      role="img"
      aria-label={rest['aria-label']}
      className={cn('flex items-end', dense ? 'gap-[3px]' : 'gap-2', className)}
      style={{ height: height + 18 }}
    >
      {bars.map((b, i) => (
        <div
          key={i}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1"
        >
          <div
            className={cn(
              'w-full rounded-t-[3px]',
              b.highlight ? 'bg-accent' : 'bg-border-strong',
            )}
            style={{
              height: Math.max(2, Math.round((b.value / max) * height)),
            }}
          />
          <span className="h-[10px] text-[10px] leading-[10px] text-faint">
            {b.label}
          </span>
        </div>
      ))}
    </div>
  )
}
