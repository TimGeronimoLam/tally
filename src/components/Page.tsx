import type { ReactNode } from 'react'

export function Page({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <section className="py-2">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      {children ?? <p className="text-slate-400">Coming soon.</p>}
    </section>
  )
}
