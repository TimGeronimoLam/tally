import {
  createContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { haptic } from '../../lib/haptics.ts'

/** Pull distance (px, after the rubber band) that refreshes on release. */
export const PULL_THRESHOLD = 64
/** How long the gap takes to close (or settle) once the finger lifts. */
export const PULL_SETTLE_MS = 300
/** Height the gap holds while the refresh runs. */
const PULL_REST = 52
/** The rubber band's limit: the pull approaches it but never gets there. */
const PULL_MAX = 160
/** A refresh that comes back sooner still shows the spinner this long. */
const MIN_REFRESH_MS = 500

/**
 * - `pull`: a finger is dragging; the distance follows it without easing.
 * - `refresh`: released past the threshold; the spinner spins.
 * - `done`: the refresh finished; the gap closes with the spinner fading.
 */
export type PullPhase = 'idle' | 'pull' | 'refresh' | 'done'

export interface PullState {
  /** How far the content below the screen's bar is pushed down, in px. */
  distance: number
  phase: PullPhase
}

const IDLE: PullState = { distance: 0, phase: 'idle' }

/** Provided by a Screen with `onRefresh`; its bar draws the gap from it. */
export const PullContext = createContext<PullState | null>(null)

/**
 * Pull-to-refresh on the scroll container around `root`. A downward drag
 * that starts with the container at its top pulls instead of scrolling;
 * letting go past the threshold calls `onRefresh` and holds the gap open
 * until it resolves. Touch only: everyone else gets the screens' polling.
 * Pass `undefined` to switch it off.
 */
export function usePullToRefresh(
  root: RefObject<HTMLElement | null>,
  onRefresh: (() => Promise<unknown>) | undefined,
): PullState {
  const [state, setState] = useState<PullState>(IDLE)
  const latest = useRef(onRefresh)
  const busy = useRef(false)
  const enabled = onRefresh !== undefined

  useEffect(() => {
    latest.current = onRefresh
  })

  useEffect(() => {
    const scroller = enabled ? scrollParent(root.current) : null
    if (!scroller) return
    let drag: {
      id: number
      x: number
      y: number
      pulling: boolean
      distance: number
    } | null = null

    async function refresh() {
      busy.current = true
      setState({ distance: PULL_REST, phase: 'refresh' })
      const started = performance.now()
      try {
        await latest.current?.()
      } catch {
        // Screens report their own fetch errors.
      }
      await sleep(MIN_REFRESH_MS - (performance.now() - started))
      setState({ distance: 0, phase: 'done' })
      await sleep(PULL_SETTLE_MS)
      busy.current = false
      setState(IDLE)
    }

    function onStart(e: TouchEvent) {
      drag = null
      if (busy.current || e.touches.length !== 1 || scroller!.scrollTop > 0) {
        return
      }
      const t = e.touches[0]
      drag = {
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        pulling: false,
        distance: 0,
      }
    }

    function onMove(e: TouchEvent) {
      const t = drag && findTouch(e.touches, drag.id)
      if (!drag || !t) return
      const dx = t.clientX - drag.x
      const dy = t.clientY - drag.y
      if (!drag.pulling) {
        if (dx === 0 && dy === 0) return
        // Decided on the first movement: straight down from the top pulls,
        // up or sideways is an ordinary scroll and is left alone.
        if (dy <= Math.abs(dx) || scroller!.scrollTop > 0 || !e.cancelable) {
          drag = null
          return
        }
        drag.pulling = true
      }
      if (dy <= 0) {
        // Pushed back above where it started: hand over to scrolling.
        drag = null
        setState(IDLE)
        return
      }
      e.preventDefault()
      const distance = rubberBand(dy)
      if (distance >= PULL_THRESHOLD && drag.distance < PULL_THRESHOLD) {
        haptic()
      }
      drag.distance = distance
      setState({ distance, phase: 'pull' })
    }

    function onEnd(e: TouchEvent) {
      if (!drag || !findTouch(e.changedTouches, drag.id)) return
      const { pulling, distance } = drag
      drag = null
      if (!pulling) return
      // A pull is not a tap: no click on whatever the finger lifts over.
      if (e.cancelable) e.preventDefault()
      if (e.type === 'touchend' && distance >= PULL_THRESHOLD) void refresh()
      else setState(IDLE)
    }

    scroller.addEventListener('touchstart', onStart, { passive: true })
    scroller.addEventListener('touchmove', onMove, { passive: false })
    scroller.addEventListener('touchend', onEnd, { passive: false })
    scroller.addEventListener('touchcancel', onEnd)
    return () => {
      scroller.removeEventListener('touchstart', onStart)
      scroller.removeEventListener('touchmove', onMove)
      scroller.removeEventListener('touchend', onEnd)
      scroller.removeEventListener('touchcancel', onEnd)
      if (drag?.pulling) setState(IDLE)
    }
  }, [enabled, root])

  return state
}

/** 1:1 at first, then stiffer and stiffer, never past PULL_MAX. */
function rubberBand(dy: number): number {
  return (dy * PULL_MAX) / (dy + PULL_MAX)
}

function findTouch(list: TouchList, id: number): Touch | undefined {
  return Array.from(list).find((t) => t.identifier === id)
}

function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)))
}
