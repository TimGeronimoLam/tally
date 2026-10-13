import { cn } from '../../lib/cn.ts'

export type ButtonVariant =
  | 'primary' // accent fill
  | 'inverse' // dark on light / light on dark
  | 'secondary' // subtle surface
  | 'outline'
  | 'ghost'
  | 'danger' // text only, red
  | 'destructive' // red fill
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonStyleProps {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
}

const base =
  'pressable inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap select-none disabled:cursor-default'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg disabled:bg-surface-2 disabled:text-faint',
  inverse: 'bg-inverse text-inverse-fg disabled:opacity-40',
  secondary: 'bg-surface text-fg disabled:opacity-40',
  outline:
    'border-[1.5px] border-border-strong bg-bg text-fg font-medium disabled:opacity-40',
  ghost: 'bg-transparent text-muted font-medium disabled:opacity-40',
  danger: 'bg-transparent text-danger font-medium disabled:opacity-40',
  destructive: 'bg-danger text-danger-fg disabled:opacity-40',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-[10px]',
  md: 'h-12 px-[18px] text-[15px] rounded-control',
  lg: 'h-14 px-5 text-[17px] rounded-card',
}

/** Class list for anything that should look like a button. */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
}: ButtonStyleProps): string {
  return cn(
    base,
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  )
}
