import { useCallback } from 'react'
import { useNavigate, type NavigateOptions, type To } from 'react-router'

/**
 * Direction of the next screen change, for the view transition in
 * src/index.css: `push` slides the new screen in from the right, `pop`
 * slides the old one out to the right, `tab` cross-fades.
 */
export type NavDirection = 'push' | 'pop' | 'tab'

export function markNav(direction: NavDirection) {
  document.documentElement.dataset.nav = direction
}

/**
 * Call once at startup. The router replays a screen's view transition on
 * browser back and forward, so mark those as pops (the hardware back
 * button and iOS edge swipe both arrive as popstate).
 */
export function initNavDirection() {
  window.addEventListener('popstate', () => markNav('pop'))
}

/**
 * `useNavigate` that also animates: `push(to)`, `pop(to)`. Pop takes a
 * path rather than -1: history deltas cannot carry the view transition.
 */
export function useNav() {
  const navigate = useNavigate()
  const go = useCallback(
    (direction: NavDirection, to: To, opts?: NavigateOptions) => {
      markNav(direction)
      void navigate(to, { ...opts, viewTransition: true })
    },
    [navigate],
  )
  return {
    push: (to: To, opts?: NavigateOptions) => go('push', to, opts),
    pop: (to: To, opts?: NavigateOptions) => go('pop', to, opts),
  }
}
