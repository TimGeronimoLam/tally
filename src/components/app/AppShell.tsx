import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { Outlet, useLocation } from 'react-router'
import { cn } from '../../lib/cn.ts'
import { OfflineBanner } from './OfflineBanner.tsx'
import { TAB_BAR_HEIGHT, TabBar } from './TabBar.tsx'

/** Scroll offset of each screen, so a tab comes back where it was left. */
const scrollPositions = new Map<string, number>()
/** How long to keep trying to restore a scroll offset while data loads. */
const RESTORE_WINDOW_MS = 600

/**
 * Scrolling content area, optionally above the tab bar. Capped at phone
 * width and centered so desktop windows show a phone-shaped column, not a
 * stretched UI. The tab bar floats over the bottom of the content, which
 * scrolls underneath its translucent background. Detail screens render
 * without tabs; they then take over the bottom safe-area padding the tab
 * bar normally provides, so nothing ends up under the home indicator.
 */
export function AppShell({ tabs = true }: { tabs?: boolean }) {
  const main = useRef<HTMLElement>(null)
  const { pathname } = useLocation()

  // Restore the screen's scroll offset. The data usually arrives a few
  // frames after the route renders, so keep nudging until the content is
  // tall enough for the offset to stick, then stop.
  useLayoutEffect(() => {
    const el = main.current
    if (!el) return
    const target = scrollPositions.get(pathname) ?? 0
    el.scrollTop = target
    if (el.scrollTop === target) return
    const deadline = performance.now() + RESTORE_WINDOW_MS
    let frame = requestAnimationFrame(function retry() {
      el.scrollTop = target
      if (el.scrollTop !== target && performance.now() < deadline) {
        frame = requestAnimationFrame(retry)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname])

  return (
    <div
      className="relative mx-auto flex h-full w-full max-w-app flex-col md:border-x md:border-border"
      style={{ '--tab-bar-height': `${TAB_BAR_HEIGHT}px` } as CSSProperties}
    >
      <OfflineBanner />
      <main
        ref={main}
        onScroll={(e) =>
          scrollPositions.set(pathname, e.currentTarget.scrollTop)
        }
        className={cn(
          // Explicit background: the view-transition snapshot is otherwise
          // transparent. Positioned so absolutely placed descendants (e.g.
          // sr-only text) stay inside the scroll clip instead of stretching
          // the document.
          'relative min-h-0 flex-1 overflow-y-auto bg-bg [view-transition-name:main]',
          tabs
            ? 'pb-[calc(var(--tab-bar-height)_+_env(safe-area-inset-bottom))]'
            : 'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <Outlet />
      </main>
      {tabs && <TabBar />}
    </div>
  )
}
