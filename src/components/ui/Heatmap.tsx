import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn.ts'
import type { HeatLevel, HeatmapData } from '../../stats/heatmap.ts'

export interface HeatmapProps {
  data: HeatmapData
  selectedDay?: string
  onSelect?: (day: string) => void
  /** Accessible label for a cell: receives day key and total. */
  cellLabel: (day: string, total: number) => string
  className?: string
}

const CELL = 10
const GAP = 2
const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

const levelClass: Record<HeatLevel, string> = {
  0: 'bg-heat-0',
  1: 'bg-heat-1',
  2: 'bg-heat-2',
  3: 'bg-heat-3',
  4: 'bg-heat-4',
}

/**
 * GitHub-style activity grid: one column per week, Monday at the top.
 * Scrolls horizontally when wider than its container, starting at the right.
 */
export function Heatmap({
  data,
  selectedDay,
  onSelect,
  cellLabel,
  className,
}: HeatmapProps) {
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [data.columns.length])

  const step = CELL + GAP

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div ref={scroller} className="no-scrollbar overflow-x-auto">
        <div className="inline-flex flex-col" style={{ gap: GAP }}>
          {/* Month labels: positioned by column index. */}
          <div
            className="relative text-[11px] leading-[14px] text-faint"
            style={{ height: 14, marginLeft: 24 }}
          >
            {data.columns.map((col, i) =>
              col.monthLabel ? (
                <span
                  key={i}
                  className="absolute top-0"
                  style={{ left: i * step }}
                >
                  {col.monthLabel}
                </span>
              ) : null,
            )}
          </div>
          <div className="flex items-start" style={{ gap: 8 }}>
            <div
              className="flex flex-col text-[9px] leading-[10px] text-faint"
              style={{ width: 16, gap: GAP }}
            >
              {ROW_LABELS.map((label, i) => (
                <span key={i} style={{ height: CELL }}>
                  {label}
                </span>
              ))}
            </div>
            <div className="flex" style={{ gap: GAP }}>
              {data.columns.map((col, i) => (
                <div key={i} className="flex flex-col" style={{ gap: GAP }}>
                  {col.cells.map((cell) => {
                    const selected = cell.day === selectedDay
                    return (
                      <button
                        key={cell.day}
                        type="button"
                        disabled={cell.future}
                        aria-label={cellLabel(cell.day, cell.total)}
                        aria-pressed={selected}
                        onClick={() => onSelect?.(cell.day)}
                        className={cn(
                          'block rounded-[2px] border-0 p-0',
                          cell.future
                            ? 'bg-surface-faint'
                            : levelClass[cell.level],
                          selected &&
                            'ring-[1.5px] ring-fg ring-offset-[1.5px] ring-offset-bg',
                        )}
                        style={{ width: CELL, height: CELL }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-faint">
        <span>Tap a day to see its total</span>
        <span className="flex items-center gap-[3px]">
          Less
          {([0, 1, 2, 3, 4] as HeatLevel[]).map((l) => (
            <span
              key={l}
              className={cn('size-[9px] rounded-[1px]', levelClass[l])}
            />
          ))}
          More
        </span>
      </div>
    </div>
  )
}
