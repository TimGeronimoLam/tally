import { useOnline } from '../../lib/useOnline.ts'

/** Thin strip at the top of the app while the device has no connection. */
export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div
      role="status"
      className="bg-inverse px-5 py-1.5 text-center text-xs font-medium text-inverse-fg"
    >
      Offline · logging still works, sync resumes when you're back
    </div>
  )
}
