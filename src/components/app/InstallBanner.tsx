import { useInstallPrompt } from '../../lib/install.ts'
import { Button, Card, ShareIcon } from '../ui/index.ts'

/**
 * Nudges browser-tab users to install the PWA. iOS Safari gets the manual
 * steps; Chrome gets the native prompt. Dismiss is remembered.
 */
export function InstallBanner() {
  const { mode, install, dismiss } = useInstallPrompt()
  if (mode === 'none') return null

  return (
    <Card className="flex items-center gap-3 px-3.5 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[13px] font-semibold">
          Add Tally to your home screen
        </span>
        <span className="text-xs leading-relaxed text-muted">
          {mode === 'ios' ? (
            <>
              Tap <ShareIcon size={14} className="inline align-[-2px]" /> Share,
              then “Add to Home Screen”. Opens full-screen and works offline.
            </>
          ) : (
            'Opens full-screen like an app and works offline.'
          )}
        </span>
      </div>
      {mode === 'prompt' ? (
        <div className="flex shrink-0 flex-col gap-1">
          <Button size="sm" onClick={() => void install()}>
            Install
          </Button>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Not now
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Got it
        </Button>
      )}
    </Card>
  )
}
