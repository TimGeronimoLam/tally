import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn.ts'
import { IconButton } from './Button.tsx'
import { ChevronLeftIcon } from './icons.tsx'

/** Translucent bar pinned under the status bar; content scrolls beneath it. */
const barClass = 'sticky top-0 z-20 bg-bg/85 backdrop-blur-xl'

/**
 * Full-height column for one route. Children lay out with flex so a screen
 * can center content (Log) or stack sections (Account).
 */
export function Screen({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex min-h-full flex-col', className)}>{children}</div>
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
    <header
      className={cn(
        barClass,
        'flex justify-between px-5 pt-[calc(env(safe-area-inset-top)_+_16px)] pb-2',
        action ? 'items-center' : 'items-baseline',
      )}
    >
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">{title}</h1>
      {action ?? (meta && <span className="text-sm text-muted">{meta}</span>)}
    </header>
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
  backLabel = 'Back',
  action,
  title,
  children,
}: ScreenNavProps) {
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
        <IconButton aria-label={backLabel} onClick={onBack}>
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
