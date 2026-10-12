import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cn } from '../../lib/cn.ts'
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
  children: ReactNode
}

/** A router link styled as a button. */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ variant, size, fullWidth, className })}
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
        'inline-flex size-11 shrink-0 items-center justify-center rounded-full text-fg',
        variant === 'outline' && 'border-[1.5px] border-border-strong bg-bg',
        className,
      )}
      {...rest}
    />
  )
}
