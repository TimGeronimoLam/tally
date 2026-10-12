import { NavLink } from 'react-router'

const tabs = [
  { to: '/', label: 'Log' },
  { to: '/stats', label: 'Stats' },
  { to: '/challenges', label: 'Challenges' },
  { to: '/achievements', label: 'Achievements' },
] as const

export function TabBar() {
  return (
    <nav
      aria-label="Primary"
      className="border-t border-slate-800 bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {tabs.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center py-3 text-xs font-medium ${
                  isActive ? 'text-accent' : 'text-slate-400'
                }`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
