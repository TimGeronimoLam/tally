import { cn } from '../../lib/cn.ts'

export interface BigNumberProps {
  value: string
  /** Caption under the number, e.g. "pushups". */
  unit?: string
  /** Dim the number (nothing entered yet). */
  placeholder?: boolean
  className?: string
}

/** Hero number for the Log screen. */
export function BigNumber({
  value,
  unit,
  placeholder,
  className,
}: BigNumberProps) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        aria-live="polite"
        className={cn(
          'text-[112px] leading-none font-medium tracking-[-0.04em]',
          placeholder ? 'text-placeholder' : 'text-fg',
        )}
      >
        {value}
      </div>
      {unit && <div className="text-[17px] text-muted">{unit}</div>}
    </div>
  )
}
