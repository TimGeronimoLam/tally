import { useSyncExternalStore } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Keep in sync with the inline bootstrap script in index.html.
const STORAGE_KEY = 'tally.theme'
const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#FFFFFF',
  dark: '#0E0E0E',
}

const media =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
const listeners = new Set<() => void>()

export function readThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    // storage unavailable (private mode etc.)
  }
  return 'system'
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref !== 'system') return pref
  return media?.matches ? 'dark' : 'light'
}

export function applyTheme(pref: ThemePreference = readThemePreference()) {
  const resolved = resolveTheme(pref)
  document.documentElement.dataset.theme = resolved
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved])
}

export function setThemePreference(pref: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // ignore
  }
  applyTheme(pref)
  listeners.forEach((l) => l())
}

/** Call once at startup: applies the theme and follows OS changes in "system" mode. */
export function initTheme() {
  applyTheme()
  media?.addEventListener('change', () => applyTheme())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useThemePreference(): [
  ThemePreference,
  (pref: ThemePreference) => void,
] {
  const pref = useSyncExternalStore(subscribe, readThemePreference)
  return [pref, setThemePreference]
}
