import {
  LOCALES,
  MESSAGES,
  systemLocale,
  useLocalePreference,
  useT,
  type LocalePreference,
} from '../../i18n/index.ts'
import { CheckIcon, ListGroup, ListRow, Sheet } from '../ui/index.ts'

export interface LanguageSheetProps {
  open: boolean
  onClose: () => void
}

/** Picks the app language: follow the device, or one of the bundled ones. */
export function LanguageSheet({ open, onClose }: LanguageSheetProps) {
  const t = useT()
  const [pref, setPref] = useLocalePreference()
  const system = MESSAGES[systemLocale()?.locale ?? 'en'].name

  const options: Array<{ value: LocalePreference; label: string }> = [
    { value: 'system', label: t.account.languageSystemDetail(system) },
    ...LOCALES.map((l) => ({ value: l, label: MESSAGES[l].name })),
  ]

  return (
    <Sheet open={open} onClose={onClose} title={t.account.language}>
      <ListGroup>
        {options.map((o) => (
          <ListRow
            key={o.value}
            label={
              <span lang={o.value === 'system' ? undefined : o.value}>
                {o.label}
              </span>
            }
            detail={
              o.value === pref ? (
                <CheckIcon size={18} className="text-fg" />
              ) : undefined
            }
            onClick={() => {
              setPref(o.value)
              onClose()
            }}
          />
        ))}
      </ListGroup>
    </Sheet>
  )
}
