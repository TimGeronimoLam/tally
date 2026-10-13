/**
 * Localisation. `useT()` in components, `messages()` elsewhere; both hand
 * back the active dictionary (src/i18n/en.ts is the typed source). Intl
 * formatting takes `currentLocale()` so dates and numbers follow the same
 * choice. Adding a language: a new file typed as `Messages`, then one line
 * each in LOCALES and MESSAGES in locale.ts.
 */
export { en, type Messages } from './en.ts'
export {
  LOCALES,
  MESSAGES,
  currentLocale,
  initLocale,
  messages,
  readLocalePreference,
  resolveLocale,
  setLocalePreference,
  systemLocale,
  useLocale,
  useLocalePreference,
  useT,
  type Locale,
  type LocalePreference,
} from './locale.ts'
