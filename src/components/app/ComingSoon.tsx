import { Gutter } from '../ui/index.ts'

/** Placeholder body for screens that are not built yet. */
export function ComingSoon({ hint }: { hint?: string }) {
  return (
    <Gutter className="pt-5">
      <p className="text-[15px] text-muted">{hint ?? 'Coming soon.'}</p>
    </Gutter>
  )
}
