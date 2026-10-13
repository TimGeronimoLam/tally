import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn.ts'
import { markNav } from '../../lib/nav.ts'

/** Outlined group of rows (settings-style list). */
export function ListGroup({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-card border-[1.5px] border-border',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface ListRowProps {
  /** Optional leading icon. */
  icon?: ReactNode
  label: ReactNode
  /** Right-aligned secondary text. */
  detail?: ReactNode
  tone?: 'default' | 'danger' | 'muted'
  /** Makes the row a button. */
  onClick?: () => void
  /** Makes the row a router link. */
  to?: string
  disabled?: boolean
}

const rowClass =
  'flex h-[52px] w-full items-center gap-2 border-b border-surface-2 bg-bg px-4 text-left text-[15px] last:border-b-0 disabled:opacity-40 transition-colors duration-100 active:bg-surface active:duration-0'

const tones = {
  default: 'text-fg',
  danger: 'text-danger',
  muted: 'text-muted',
}

/** A row inside a ListGroup. Button, link, or static depending on props. */
export function ListRow({
  icon,
  label,
  detail,
  tone = 'default',
  onClick,
  to,
  disabled,
}: ListRowProps) {
  const body = (
    <>
      {icon && <span className="flex shrink-0 text-fg">{icon}</span>}
      <span className={cn('flex-1 truncate', tones[tone])}>{label}</span>
      {detail && (
        <span className="shrink-0 text-[13px] text-faint">{detail}</span>
      )}
    </>
  )
  if (to) {
    return (
      <Link
        to={to}
        viewTransition
        onClick={() => markNav('push')}
        className={cn(rowClass, 'no-underline')}
      >
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={rowClass}
      >
        {body}
      </button>
    )
  }
  return <div className={rowClass}>{body}</div>
}
