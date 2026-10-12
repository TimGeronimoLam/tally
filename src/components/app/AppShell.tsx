import { Outlet } from 'react-router'
import { TabBar } from './TabBar.tsx'

/**
 * Scrolling content area, optionally above the tab bar. Capped at phone
 * width and centered so desktop windows show a phone-shaped column, not a
 * stretched UI. Detail screens render without tabs.
 */
export function AppShell({ tabs = true }: { tabs?: boolean }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-app flex-col md:border-x md:border-border">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {tabs && <TabBar />}
    </div>
  )
}
