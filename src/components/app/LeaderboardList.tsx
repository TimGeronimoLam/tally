import type { LeaderboardRow } from '../../challenges/types.ts'
import { useT } from '../../i18n/index.ts'
import { cn } from '../../lib/cn.ts'
import { formatNumber } from '../../lib/format.ts'
import { Avatar } from '../ui/index.ts'

export interface LeaderboardListProps {
  rows: LeaderboardRow[]
  /** The viewer; their row is emphasised and labelled "You". */
  meId: string | null
  /** Tighter rows for card previews. */
  compact?: boolean
  className?: string
}

/** Ranked member rows: rank, avatar, name, today's delta, total. */
export function LeaderboardList({
  rows,
  meId,
  compact,
  className,
}: LeaderboardListProps) {
  const t = useT()
  return (
    <ol className={cn('flex flex-col', className)}>
      {rows.map((r) => {
        const me = r.userId === meId
        return (
          <li
            key={r.userId}
            className={cn(
              'flex items-center gap-3 border-b border-surface-2 last:border-b-0',
              compact ? 'h-11' : 'h-13',
              me && 'font-semibold',
            )}
          >
            <span className="w-5 text-right text-sm text-faint">{r.rank}</span>
            <Avatar initial={r.displayName} highlight={me} />
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
          </li>
        )
      })}
    </ol>
  )
}
