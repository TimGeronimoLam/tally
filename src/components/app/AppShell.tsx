import { Outlet } from 'react-router'
import { cn } from '../../lib/cn.ts'
import { OfflineBanner } from './OfflineBanner.tsx'
import { TabBar } from './TabBar.tsx'

/**
 * Scrolling content area, optionally above the tab bar. Capped at phone
 * width and centered so desktop windows show a phone-shaped column, not a
 * stretched UI. Detail screens render without tabs; they then take over
 * the bottom safe-area padding the tab bar normally provides, so nothing
 * ends up under the home indicator or gesture bar.
 */
export function AppShell({ tabs = true }: { tabs?: boolean }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-app flex-col md:border-x md:border-border">
      <OfflineBanner />
      <main
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          !tabs && 'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <Outlet />
      </main>
      {tabs && <TabBar />}
    </div>
  )
}
