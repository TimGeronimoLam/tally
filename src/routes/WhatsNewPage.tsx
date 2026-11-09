import { useEffect } from 'react'
import { APP_VERSION, RELEASES, markVersionSeen } from '../changelog/index.ts'
import { Gutter, Screen, ScreenNav } from '../components/ui/index.ts'
import { useT } from '../i18n/index.ts'
import { cn } from '../lib/cn.ts'
import { parseDayKey } from '../lib/date.ts'
import { formatFullDate } from '../lib/format.ts'
import { useNav } from '../lib/nav.ts'

/** Every release with its notes, newest first. Reading it counts as seen. */
export function WhatsNewPage() {
  const t = useT()
  const nav = useNav()

  useEffect(() => {
    markVersionSeen()
  }, [])

  return (
    <Screen>
      <ScreenNav onBack={() => nav.pop('/account')} title={t.changelog.title} />

      <div className="flex flex-col gap-7 pt-5 pb-8">
        {RELEASES.map((r) => {
          const current = r.version === APP_VERSION
          return (
            <Gutter key={r.version} className="flex flex-col gap-2.5">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
                  {t.changelog.version(r.version)}
                </h2>
                {current && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-fg">
                    {t.changelog.current}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[13px] text-faint">
                  {formatFullDate(parseDayKey(r.date))}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {t.changelog.notes[r.version].map((note, i) => (
                  <li
                    key={i}
                    className={cn(
                      'flex gap-2.5 text-[15px] leading-snug',
                      current ? 'text-fg' : 'text-muted',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[9px] size-1.5 shrink-0 rounded-full bg-border-strong"
                    />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </Gutter>
          )
        })}
      </div>
    </Screen>
  )
}
