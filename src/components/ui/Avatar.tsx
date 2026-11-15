import { useState } from 'react'
import { cn } from '../../lib/cn.ts'

export interface AvatarProps {
  /** Usually the first letter of a display name. */
  initial: string
  /** Picture URL. The initial shows until it loads, and for good if it fails. */
  src?: string | null
  /** Accent fill, used for the current user. */
  highlight?: boolean
  /**
   * 32px circle for list rows (default), 80px circle for a profile header,
   * or a rounded square as wide as its container for a profile photo.
   */
  size?: 'md' | 'xl' | 'full'
  className?: string
}

/** Round avatar: a photo when there is one, else an initial. */
export function Avatar({
  initial,
  src,
  highlight,
  size = 'md',
  className,
}: AvatarProps) {
  // Keyed by URL, so a new picture gets a fresh try after a failed one.
  const [state, setState] = useState<{ src: string; ok: boolean } | null>(null)
  const loaded = src != null && state?.src === src && state.ok
  const failed = src != null && state?.src === src && !state.ok
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden font-semibold',
        size === 'full'
          ? 'aspect-square w-full rounded-2xl text-[96px]'
          : size === 'xl'
            ? 'size-20 rounded-full text-[32px]'
            : 'size-8 rounded-full text-[13px]',
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
