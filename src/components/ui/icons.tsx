/* oxlint-disable react/only-export-components -- icons are built by a factory; no fast refresh needed */
import type { ReactNode, SVGProps } from 'react'

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  /** Pixel size, applied to both width and height. */
  size?: number
  strokeWidth?: number
}

/**
 * Stroke icons on a 24px grid, matching the design canvas.
 * Decorative by default (`aria-hidden`); pass `aria-label` to make one meaningful.
 */
function createIcon(paths: ReactNode, defaultStrokeWidth = 1.75) {
  return function Icon({
    size = 24,
    strokeWidth = defaultStrokeWidth,
    ...rest
  }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={rest['aria-label'] ? undefined : true}
        role={rest['aria-label'] ? 'img' : undefined}
        {...rest}
      >
        {paths}
      </svg>
    )
  }
}

export const PlusIcon = createIcon(<path d="M12 5v14M5 12h14" />, 2)

export const BackspaceIcon = createIcon(
  <>
    <path d="M21 5H9l-6 7 6 7h12V5z" />
    <path d="M18 9l-6 6M12 9l6 6" />
  </>,
)

export const ChevronLeftIcon = createIcon(<path d="M15 5l-7 7 7 7" />, 2)

export const ShareIcon = createIcon(
  <>
    <path d="M12 16V4" />
    <path d="M8 8l4-4 4 4" />
    <path d="M5 13v6h14v-6" />
  </>,
)

export const CopyIcon = createIcon(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h9" />
  </>,
)

export const CalendarIcon = createIcon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>,
  2,
)

export const ClockIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
  2,
)

export const LockIcon = createIcon(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </>,
  2,
)

export const TrophyIcon = createIcon(
  <>
    <path d="M8 21h8M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
  </>,
  2,
)

export const PeopleIcon = createIcon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.5 4 2.5 4 6" />
  </>,
  2,
)

export const DownloadIcon = createIcon(
  <>
    <path d="M12 4v12" />
    <path d="M8 12l4 4 4-4" />
    <path d="M5 20h14" />
  </>,
)

export const UploadIcon = createIcon(
  <>
    <path d="M12 16V4" />
    <path d="M8 8l4-4 4 4" />
    <path d="M5 20h14" />
  </>,
)

export const TrashIcon = createIcon(
  <>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 14h10l1-14" />
  </>,
)

export const CheckIcon = createIcon(<path d="M5 12l5 5 9-10" />, 2)

/* Tab bar */
export const LogIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v8M8 12h8" />
  </>,
)

export const StatsIcon = createIcon(
  <>
    <path d="M4 20h16" />
    <path d="M6 16v-5M11 16V7M16 16v-3M21 16V4" />
  </>,
)

export const FlagIcon = createIcon(
  <>
    <path d="M5 21v-16" />
    <path d="M5 5h13l-3 4 3 4H5" />
  </>,
)

export const MedalIcon = createIcon(
  <>
    <circle cx="12" cy="9" r="6" />
    <path d="M8.5 14l-1.5 7 5-3 5 3-1.5-7" />
  </>,
)

export const UserIcon = createIcon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
  </>,
)
