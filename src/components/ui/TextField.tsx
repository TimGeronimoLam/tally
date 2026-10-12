import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn.ts'

export const inputClassName =
  'h-[52px] w-full rounded-control border-[1.5px] border-border-strong bg-bg px-3.5 text-base text-fg placeholder:text-placeholder focus:border-fg'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  /** Keep the label for screen readers only. */
  hideLabel?: boolean
  className?: string
}

/** Labelled single-line input. */
export function TextField({
  label,
  hideLabel,
  id,
  className,
  ...rest
}: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        htmlFor={inputId}
        className={cn(
          'text-[13px] font-medium text-fg',
          hideLabel && 'sr-only',
        )}
      >
        {label}
      </label>
      <input id={inputId} className={inputClassName} {...rest} />
    </div>
  )
}
