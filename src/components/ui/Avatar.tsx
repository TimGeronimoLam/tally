import { useState } from 'react'
import { cn } from '../../lib/cn.ts'

export interface AvatarProps {
  /** Usually the first letter of a display name. */
  initial: string
  /** Picture URL. The initial shows until it loads, and for good if it fails. */
  src?: string | null
  /** Accent fill, used for the current user. */
  highlight?: boolean
  className?: string
}

/** 32px avatar for leaderboards: a photo when there is one, else an initial. */
export function Avatar({ initial, src, highlight, className }: AvatarProps) {
  // Keyed by URL, so a new picture gets a fresh try after a failed one.
  const [state, setState] = useState<{ src: string; ok: boolean } | null>(null)
  const loaded = src != null && state?.src === src && state.ok
  const failed = src != null && state?.src === src && !state.ok
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-semibold',
        highlight ? 'bg-accent text-accent-fg' : 'bg-surface-2 text-fg',
        className,
      )}
    >
      {initial.slice(0, 1).toUpperCase()}
      {src && !failed && (
        <img
          src={src}
          alt=""
          // Lets the service worker keep a readable copy for offline use.
          crossOrigin="anonymous"
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setState({ src, ok: true })}
          onError={() => setState({ src, ok: false })}
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-150',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </span>
  )
}
