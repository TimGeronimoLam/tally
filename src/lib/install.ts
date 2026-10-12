import { useCallback, useEffect, useState } from 'react'

/** Chrome's deferred install prompt (not in lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'tally.installHintDismissed'

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  const ua = navigator.userAgent
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/** Safari proper; Chrome/Firefox/Edge on iOS cannot install PWAs. */
export function isIOSSafari(): boolean {
  const ua = navigator.userAgent
  return isIOS() && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export type InstallMode = 'none' | 'ios' | 'prompt'

export interface InstallState {
  /** 'ios': show manual instructions; 'prompt': a native prompt is available. */
  mode: InstallMode
  install: () => Promise<void>
  dismiss: () => void
}

/**
 * Whether and how to offer installation. Hidden once installed, dismissed,
 * or when the platform offers nothing.
 */
export function useInstallPrompt(): InstallState {
  const [dismissed, setDismissed] = useState(readDismissed)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  )
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setInstalled(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // ignore
    }
    setDismissed(true)
  }, [])

  const install = useCallback(async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    setDeferred(null)
    if (outcome === 'accepted') setInstalled(true)
    else dismiss()
  }, [deferred, dismiss])

  let mode: InstallMode = 'none'
  if (!installed && !dismissed) {
    if (deferred) mode = 'prompt'
    else if (isIOSSafari()) mode = 'ios'
  }
  return { mode, install, dismiss }
}
