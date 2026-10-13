import { NavLink } from 'react-router'
import { useT, type Messages } from '../../i18n/index.ts'
import { cn } from '../../lib/cn.ts'
import { markNav } from '../../lib/nav.ts'
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
  label: keyof Messages['tabs']
  icon: (props: IconProps) => React.JSX.Element
}

const TABS: Tab[] = [
  { to: '/', label: 'log', icon: LogIcon },
  { to: '/stats', label: 'stats', icon: StatsIcon },
  { to: '/challenges', label: 'challenges', icon: FlagIcon },
  { to: '/achievements', label: 'achievements', icon: MedalIcon },
  { to: '/account', label: 'account', icon: UserIcon },
]

/** Height of the tab row (px), excluding the home-indicator inset. */
export const TAB_BAR_HEIGHT = 50

/**
 * Bottom navigation. Five equal tabs, padded for the home indicator. Floats
 * over the content with a translucent blur, like a native tab bar. Named
 * for view transitions so it stays put while screens slide underneath.
 */
export function TabBar() {
  const t = useT()
  return (
    <nav
      aria-label="Main"
      className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-5 border-t border-border/60 bg-bg/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl [view-transition-name:tabbar]"
    >
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          viewTransition
          onClick={() => markNav('tab')}
          className={({ isActive }) =>
            cn(
              'pressable-dim flex h-[var(--tab-bar-height)] flex-col items-center justify-center gap-0.5 text-[11px] font-medium no-underline',
              isActive ? 'text-fg' : 'text-faint',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon strokeWidth={isActive ? 2 : 1.75} />
              {t.tabs[label]}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
