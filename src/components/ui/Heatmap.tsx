import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn.ts'
import type { HeatLevel, HeatmapData } from '../../stats/heatmap.ts'

export interface HeatmapProps {
  data: HeatmapData
  selectedDay?: string
  onSelect?: (day: string) => void
  /** Accessible label for a cell: receives day key and total. */
  cellLabel: (day: string, total: number) => string
  /** Visible square size in px. The tap target is `cellSize + gap`. */
  cellSize?: number
  gap?: number
  className?: string
}

const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']
const ROW_LABEL_WIDTH = 28

const levelClass: Record<HeatLevel, string> = {
  0: 'bg-heat-0',
  1: 'bg-heat-1',
  2: 'bg-heat-2',
  3: 'bg-heat-3',
  4: 'bg-heat-4',
}

/**
 * GitHub-style activity grid: one column per week, Monday at the top.
 * Each cell's button covers the gap around it so fingers hit a full
 * `cellSize + gap` square. Scrolls horizontally when wider than its
 * container, starting at the right.
 */
export function Heatmap({
  data,
  selectedDay,
  onSelect,
  cellLabel,
  cellSize = 20,
  gap = 3,
  className,
}: HeatmapProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const step = cellSize + gap

  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [data.columns.length])

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div ref={scroller} className="no-scrollbar overflow-x-auto">
        <div className="inline-flex flex-col">
          {/* Month labels, positioned by column index. */}
          <div
            className="relative text-[11px] leading-[14px] text-faint"
            style={{ height: 16, marginLeft: ROW_LABEL_WIDTH + gap / 2 }}
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
          <div className="flex items-start">
            <div
              className="sticky left-0 z-10 flex shrink-0 flex-col bg-bg text-[11px] text-faint"
              style={{ width: ROW_LABEL_WIDTH }}
            >
              {ROW_LABELS.map((label, i) => (
                <span
                  key={i}
                  className="flex items-center"
                  style={{ height: step }}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="flex">
              {data.columns.map((col, i) => (
                <div key={i} className="flex flex-col">
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
                        className="block border-0 bg-transparent"
                        style={{ width: step, height: step, padding: gap / 2 }}
                      >
                        <span
                          className={cn(
                            'block size-full rounded-[4px]',
                            cell.future
                              ? 'bg-surface-faint'
                              : levelClass[cell.level],
                            selected &&
                              'ring-[2px] ring-fg ring-offset-[2px] ring-offset-bg',
                          )}
                        />
                      </button>
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
              className={cn('size-[10px] rounded-[2px]', levelClass[l])}
            />
          ))}
          More
        </span>
      </div>
    </div>
  )
}
