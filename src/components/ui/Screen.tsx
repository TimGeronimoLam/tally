import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../../i18n/index.ts'
import { cn } from '../../lib/cn.ts'
import { IconButton } from './Button.tsx'
import { ChevronLeftIcon } from './icons.tsx'
import {
  PULL_SETTLE_MS,
  PULL_THRESHOLD,
  PullContext,
  usePullToRefresh,
} from './usePullToRefresh.ts'

/** Translucent bar pinned under the status bar; content scrolls beneath it. */
const barClass = 'sticky top-0 z-20 bg-bg/85 backdrop-blur-xl'

/**
 * Full-height column for one route. Children lay out with flex so a screen
 * can center content (Log) or stack sections (Account).
 */
export function Screen({
  className,
  onRefresh,
  children,
}: {
  className?: string
  /**
   * Turns on pull-to-refresh. The spinner opens under the screen's
   * ScreenHeader or ScreenNav, and stays until the promise settles.
   */
  onRefresh?: () => Promise<unknown>
  children: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const pull = usePullToRefresh(root, onRefresh)
  return (
    <PullContext.Provider value={onRefresh ? pull : null}>
      <div ref={root} className={cn('flex min-h-full flex-col', className)}>
        {children}
      </div>
    </PullContext.Provider>
  )
}

/** Circumference of the spinner's r=9 circle. */
const SPINNER_ARC = 2 * Math.PI * 9

/**
 * The gap a bar opens beneath itself while its Screen is pulled: the bar
 * stays put, the content below moves down, and a spinner winds up in the
 * gap (a full turn and a three-quarter arc at the threshold), then spins
 * until the refresh is done. Renders nothing without `onRefresh`.
 */
function PullIndicator() {
  const t = useT()
  const pull = useContext(PullContext)
  if (!pull) return null
  const { distance, phase } = pull
  const spinning = phase === 'refresh' || phase === 'done'
  const progress = spinning ? 1 : Math.min(1, distance / PULL_THRESHOLD)
  const ease = `${PULL_SETTLE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden"
      style={{
        height: distance,
        transition: phase === 'pull' ? 'none' : `height ${ease}`,
      }}
    >
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className={cn('text-muted', spinning && 'animate-spin')}
        style={{
          opacity: phase === 'done' ? 0 : progress,
          transform: spinning ? undefined : `rotate(${progress * 360}deg)`,
          transition:
            phase === 'pull' ? 'none' : `opacity ${ease}, transform ${ease}`,
        }}
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeDasharray={`${SPINNER_ARC * 0.75 * progress} ${SPINNER_ARC}`}
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span role="status" className="sr-only">
        {phase === 'refresh' ? t.common.refreshing : ''}
      </span>
    </div>
  )
}

export interface ScreenHeaderProps {
  title: string
  /** Right-aligned text, e.g. today's date or "9 of 12". */
  meta?: ReactNode
  /** Right-aligned control, e.g. a "New" button. Overrides `meta`. */
  action?: ReactNode
}

/** Title row at the top of a screen, padded under the status bar. */
export function ScreenHeader({ title, meta, action }: ScreenHeaderProps) {
  return (
    <>
      <header
        className={cn(
          barClass,
          'flex justify-between px-5 pt-[calc(env(safe-area-inset-top)_+_16px)] pb-2',
          action ? 'items-center' : 'items-baseline',
        )}
      >
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">
          {title}
        </h1>
        {action ?? (meta && <span className="text-sm text-muted">{meta}</span>)}
      </header>
      <PullIndicator />
    </>
  )
}

export interface ScreenNavProps {
  onBack: () => void
  /** Accessible name for the back button. */
  backLabel?: string
  /** Right-aligned control, e.g. a share button. */
  action?: ReactNode
  /** Large title under the bar; moves into the bar once scrolled under it. */
  title: string
  /** Rendered under the large title, e.g. a subtitle line. */
  children?: ReactNode
}

/**
 * Back-button bar for pushed screens, pinned under the status bar, with
 * the screen's title below it. Like a native navigation bar, the large
 * title scrolls away and a compact one fades in at the bar's center once
 * the bar starts to cover it.
 */
export function ScreenNav({
  onBack,
  backLabel,
  action,
  title,
  children,
}: ScreenNavProps) {
  const t = useT()
  const bar = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const update = () => {
      const b = bar.current?.getBoundingClientRect()
      const h = heading.current?.getBoundingClientRect()
      if (b && h) setCollapsed(h.top < b.bottom)
    }
    update()
    // Capture phase: the scrolling element is an ancestor, not the window.
    window.addEventListener('scroll', update, true)
    return () => window.removeEventListener('scroll', update, true)
  }, [])

  return (
    <>
      <div
        ref={bar}
        className={cn(
          barClass,
          'flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)_+_8px)] pb-1',
        )}
      >
        <IconButton aria-label={backLabel ?? t.common.back} onClick={onBack}>
          <ChevronLeftIcon />
        </IconButton>
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-14 bottom-1 h-11 truncate text-center text-[17px] leading-[44px] font-semibold transition-[opacity,transform] duration-150',
            collapsed ? 'opacity-100' : 'translate-y-1 opacity-0',
          )}
        >
          {title}
        </span>
        {action ?? <span className="size-11" />}
      </div>
      <PullIndicator />
      <Gutter className="flex flex-col gap-1 pt-2">
        <h1
          ref={heading}
          className="text-[28px] font-semibold tracking-[-0.02em]"
        >
          {title}
        </h1>
        {children}
      </Gutter>
    </>
  )
}

/** Horizontal padding matching the screen gutter. */
export function Gutter({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return <div className={cn('px-5', className)}>{children}</div>
}
