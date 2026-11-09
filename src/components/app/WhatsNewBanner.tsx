import { APP_VERSION, useWhatsNewPending } from '../../changelog/index.ts'
import { useT } from '../../i18n/index.ts'
import { useNav } from '../../lib/nav.ts'
import { Button, Card } from '../ui/index.ts'

/**
 * Tells a device once, after an update, that the app changed, and offers
 * the notes. Opening them or dismissing remembers the version.
 */
export function WhatsNewBanner() {
  const t = useT()
  const nav = useNav()
  const { pending, dismiss } = useWhatsNewPending()
  if (!pending) return null

  return (
    <Card className="flex items-center gap-3 px-3.5 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold">
          {t.changelog.updated(APP_VERSION)}
        </span>
        <span className="line-clamp-2 text-xs leading-relaxed text-muted">
          {t.changelog.notes[APP_VERSION][0]}
        </span>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          size="sm"
          onClick={() => {
            dismiss()
            nav.push('/account/whats-new')
          }}
        >
          {t.changelog.whatsNew}
        </Button>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          {t.common.dismiss}
        </Button>
      </div>
    </Card>
  )
}
