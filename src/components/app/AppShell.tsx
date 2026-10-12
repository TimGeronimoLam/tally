import { Outlet } from 'react-router'
import { TabBar } from './TabBar.tsx'

/** Scrolling content area above a fixed tab bar. */
export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
