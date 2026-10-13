import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '../../lib/cn.ts'
import { markNav, type NavDirection } from '../../lib/nav.ts'
import { buttonClassName, type ButtonStyleProps } from './buttonStyles.ts'

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  children: ReactNode
}

export function Button({
  variant,
  size,
  fullWidth,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, fullWidth, className })}
      {...rest}
    />
  )
}

export interface ButtonLinkProps extends LinkProps, ButtonStyleProps {
  /** How the screen change animates; see src/lib/nav.ts. */
  direction?: NavDirection
  children: ReactNode
}

/** A router link styled as a button. Pushes the next screen by default. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  direction = 'push',
  onClick,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      viewTransition
      className={buttonClassName({ variant, size, fullWidth, className })}
      onClick={(e) => {
        markNav(direction)
        onClick?.(e)
      }}
      {...rest}
    />
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need an accessible name. */
  'aria-label': string
  variant?: 'outline' | 'ghost'
  children: ReactNode
}

/** 44px round touch target holding a single icon. */
export function IconButton({
  variant = 'ghost',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'pressable inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg',
        variant === 'outline' && 'border-[1.5px] border-border-strong bg-bg',
        className,
      )}
      {...rest}
    />
  )
}
