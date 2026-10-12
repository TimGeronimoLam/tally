import { NavLink } from 'react-router'
import { cn } from '../../lib/cn.ts'
import {
  FlagIcon,
  LogIcon,
  MedalIcon,
  StatsIcon,
  UserIcon,
  type IconProps,
} from '../ui/index.ts'

interface Tab {
  to: string
  label: string
  icon: (props: IconProps) => React.JSX.Element
}

const TABS: Tab[] = [
  { to: '/', label: 'Log', icon: LogIcon },
  { to: '/stats', label: 'Stats', icon: StatsIcon },
  { to: '/challenges', label: 'Challenges', icon: FlagIcon },
  { to: '/achievements', label: 'Achievements', icon: MedalIcon },
  { to: '/account', label: 'Account', icon: UserIcon },
]

/** Bottom navigation. Five equal tabs, padded for the home indicator. */
export function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="grid grid-cols-5 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)]"
    >
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium no-underline',
              isActive ? 'text-fg' : 'text-faint',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon strokeWidth={isActive ? 2 : 1.75} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
