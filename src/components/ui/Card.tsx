import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn.ts'

export type CardVariant = 'filled' | 'outline' | 'dashed'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  /** Render as a router link to this path. */
  to?: string
  children: ReactNode
}

const variants: Record<CardVariant, string> = {
  filled: 'bg-surface',
  outline: 'border-[1.5px] border-border',
  dashed: 'border-[1.5px] border-dashed border-border-strong',
}

/** Rounded content container. Pass `to` to make the whole card a link. */
export function Card({
  variant = 'filled',
  to,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = cn(
    'block rounded-card p-4 text-fg',
    variants[variant],
    className,
  )
  if (to) {
    return (
      <Link to={to} className={cn(classes, 'no-underline')}>
        {children}
      </Link>
    )
  }
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
