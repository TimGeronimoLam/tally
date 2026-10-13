import type { ReactNode } from 'react'

/** Label above a control that has none of its own, e.g. a segmented control. */
export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium">{label}</span>
      {children}
    </div>
  )
}
