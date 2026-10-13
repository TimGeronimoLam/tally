/**
 * The dictionaries, free of React and the browser, so the Cloudflare Worker
 * (worker/) can word push notifications in the same strings as the app.
 */
import { de } from './de.ts'
import { en, type Messages } from './en.ts'
import { es } from './es.ts'
import { fr } from './fr.ts'
import { it } from './it.ts'
import { nl } from './nl.ts'
import { pt } from './pt.ts'

export const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl', 'pt'] as const
export type Locale = (typeof LOCALES)[number]

export const MESSAGES: Record<Locale, Messages> = {
  en,
  de,
  fr,
  es,
  it,
  nl,
  pt,
}

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as readonly string[]).includes(v)
}
