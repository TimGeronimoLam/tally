import { Link } from 'react-router'
import type { LeaderboardRow } from '../../challenges/types.ts'
import { useT } from '../../i18n/index.ts'
import { cn } from '../../lib/cn.ts'
import { formatNumber } from '../../lib/format.ts'
import { markNav } from '../../lib/nav.ts'
import { avatarUrl } from '../../sync/index.ts'
import { Avatar, ChevronRightIcon } from '../ui/index.ts'

export interface LeaderboardListProps {
  rows: LeaderboardRow[]
  /** The viewer; their row is emphasised and labelled "You". */
  meId: string | null
  /** Tighter rows for card previews. */
  compact?: boolean
  /** Makes each row a link, e.g. to that member's stats. */
  rowHref?: (row: LeaderboardRow) => string
  className?: string
}

/** Ranked member rows: rank, avatar, name, today's delta, total. */
export function LeaderboardList({
  rows,
  meId,
  compact,
  rowHref,
  className,
}: LeaderboardListProps) {
  const t = useT()
  return (
    <ol className={cn('flex flex-col', className)}>
      {rows.map((r) => {
        const me = r.userId === meId
        const rowClass = cn(
          'flex items-center gap-3',
          compact ? 'h-11' : 'h-13',
          me && 'font-semibold',
        )
        const body = (
          <>
            <span className="w-5 text-right text-sm text-faint">{r.rank}</span>
            <Avatar
              initial={r.displayName}
              src={avatarUrl(r.userId, r.avatarUpdatedAt)}
              highlight={me}
            />
            <span className="min-w-0 flex-1 truncate text-[15px]">
              {r.displayName}
              {me && (
                <span className="font-normal text-muted">
                  {' '}
                  {t.challenges.youSuffix}
                </span>
              )}
            </span>
            <span className="text-xs font-normal text-faint">
              {t.challenges.today(formatNumber(r.today))}
            </span>
            <span className="w-14 text-right text-[15px] tabular-nums">
              {formatNumber(r.total)}
            </span>
          </>
        )
        return (
          <li
            key={r.userId}
            className="border-b border-surface-2 last:border-b-0"
          >
            {rowHref ? (
              <Link
                to={rowHref(r)}
                viewTransition
                onClick={() => markNav('push')}
                className={cn(rowClass, 'pressable-dim text-fg no-underline')}
              >
                {body}
                <ChevronRightIcon
                  size={16}
                  className="-ml-1.5 shrink-0 text-faint"
                />
              </Link>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
