import { useT } from '../../i18n/index.ts'
import { useInstallPrompt } from '../../lib/install.ts'
import { Button, Card, ShareIcon } from '../ui/index.ts'

/**
 * Nudges browser-tab users to install the PWA. iOS Safari gets the manual
 * steps; Chrome gets the native prompt. Dismiss is remembered.
 */
export function InstallBanner() {
  const t = useT()
  const { mode, install, dismiss } = useInstallPrompt()
  if (mode === 'none') return null

  return (
    <Card className="flex items-center gap-3 px-3.5 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold">{t.install.title}</span>
        <span className="text-xs leading-relaxed text-muted">
          {mode === 'ios' ? (
            <>
              {t.install.iosBefore}{' '}
              <ShareIcon size={14} className="inline align-[-2px]" />{' '}
              {t.install.iosAfter}
            </>
          ) : (
            t.install.prompt
          )}
        </span>
      </div>
      {mode === 'prompt' ? (
        <div className="flex shrink-0 flex-col gap-1">
          <Button size="sm" onClick={() => void install()}>
            {t.install.install}
          </Button>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            {t.common.notNow}
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={dismiss}>
          {t.install.gotIt}
        </Button>
      )}
    </Card>
  )
}
