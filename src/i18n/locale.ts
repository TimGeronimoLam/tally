import { useSyncExternalStore } from 'react'
import { de } from './de.ts'
import { en, type Messages } from './en.ts'
import { es } from './es.ts'
import { fr } from './fr.ts'
import { it } from './it.ts'
import { nl } from './nl.ts'
import { pt } from './pt.ts'

export const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl', 'pt'] as const
export type Locale = (typeof LOCALES)[number]
/** 'system' follows the device language, falling back to English. */
export type LocalePreference = 'system' | Locale

export const MESSAGES: Record<Locale, Messages> = {
  en,
  de,
  fr,
  es,
  it,
  nl,
  pt,
}

const STORAGE_KEY = 'tally.locale'

interface Resolved {
  locale: Locale
  /** Full BCP 47 tag for Intl (keeps the region: en-GB dates, de-CH numbers). */
  tag: string
  messages: Messages
}

function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v)
}

export function readLocalePreference(): LocalePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'system' || isLocale(v)) return v
  } catch {
    // storage unavailable (private mode, tests)
  }
  return 'system'
}

/** The device's first language Tally has, with its region, or null. */
export function systemLocale(): { locale: Locale; tag: string } | null {
  if (typeof navigator === 'undefined') return null
  const tags = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]
  for (const tag of tags) {
    if (!tag) continue
    const primary = tag.toLowerCase().split('-')[0]
    if (isLocale(primary)) return { locale: primary, tag }
  }
  return null
}

export function resolveLocale(pref: LocalePreference): Resolved {
  if (pref !== 'system') {
    return { locale: pref, tag: pref, messages: MESSAGES[pref] }
  }
  const sys = systemLocale()
  return sys
    ? { ...sys, messages: MESSAGES[sys.locale] }
    : { locale: 'en', tag: 'en', messages: en }
}

let preference: LocalePreference = readLocalePreference()
let current: Resolved = resolveLocale(preference)
const listeners = new Set<() => void>()

/** BCP 47 tag for Intl formatting (dates, numbers). */
export function currentLocale(): string {
  return current.tag
}

/** The active dictionary, for code outside React. */
export function messages(): Messages {
  return current.messages
}

function apply() {
  current = resolveLocale(preference)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = current.locale
  }
  for (const l of listeners) l()
}

export function setLocalePreference(pref: LocalePreference) {
  preference = pref
  try {
    localStorage.setItem(STORAGE_KEY, pref)
  } catch {
    // ignore
  }
  apply()
}

/** Call once at startup: sets `<html lang>` and follows device changes in "system" mode. */
export function initLocale() {
  apply()
  window.addEventListener('languagechange', () => {
    if (preference === 'system') apply()
  })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useLocalePreference(): [
  LocalePreference,
  (pref: LocalePreference) => void,
] {
  const pref = useSyncExternalStore(subscribe, () => preference)
  return [pref, setLocalePreference]
}

/** The active dictionary; re-renders when the language changes. */
export function useT(): Messages {
  return useSyncExternalStore(subscribe, () => current.messages)
}

/** The active Intl tag; re-renders when the language changes. */
export function useLocale(): string {
  return useSyncExternalStore(subscribe, () => current.tag)
}
