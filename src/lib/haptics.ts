/**
 * Short haptic tick for key presses and confirmations. Call it from a user
 * gesture handler; browsers ignore it otherwise.
 *
 * Android (and any browser with the Vibration API) vibrates directly. iOS
 * has no web haptics API, but toggling a `<input type="checkbox" switch>`
 * through its label fires the system switch haptic (Safari 17.4+). Browsers
 * with neither do nothing.
 */
export type HapticKind = 'tap' | 'confirm'

const PATTERNS: Record<HapticKind, number | number[]> = {
  tap: 8,
  confirm: [12, 40, 18],
}

let iosSwitch: HTMLLabelElement | null = null

function tapIosSwitch() {
  if (!iosSwitch) {
    iosSwitch = document.createElement('label')
    iosSwitch.setAttribute('aria-hidden', 'true')
    iosSwitch.style.cssText =
      'position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    iosSwitch.appendChild(input)
    document.body.appendChild(iosSwitch)
  }
  iosSwitch.click()
}

const isIos =
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

export function haptic(kind: HapticKind = 'tap') {
  try {
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(PATTERNS[kind])
    } else if (isIos) {
      tapIosSwitch()
    }
  } catch {
    // Haptics are a nicety; never let them break a tap.
  }
}
