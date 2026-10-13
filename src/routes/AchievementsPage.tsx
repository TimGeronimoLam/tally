import { useEffect } from 'react'
import {
  SECTIONS,
  evaluateAchievements,
  useAchievements,
  type AchievementIcon,
} from '../achievements/index.ts'
import {
  Badge,
  BadgeGrid,
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  Gutter,
  LayersIcon,
  PeopleIcon,
  Screen,
  ScreenHeader,
  SectionLabel,
  TrophyIcon,
} from '../components/ui/index.ts'
import { useT } from '../i18n/index.ts'

const ICONS = {
  calendar: CalendarIcon,
  clock: ClockIcon,
  layers: LayersIcon,
  flag: FlagIcon,
  trophy: TrophyIcon,
  people: PeopleIcon,
}

function renderIcon(icon: AchievementIcon) {
  if ('text' in icon) return icon.text
  const Icon = ICONS[icon.icon]
  return <Icon size={22} />
}

export function AchievementsPage() {
  const t = useT()
  const { items, unlockedCount, total, latestId, loading } = useAchievements()

  // Catch up on anything earned outside the Log screen (imports, old data).
  useEffect(() => {
    void evaluateAchievements()
  }, [])

  if (loading) return null

  return (
    <Screen>
      <ScreenHeader
        title={t.achievements.title}
        meta={t.achievements.meta(unlockedCount, total)}
      />
      {SECTIONS.map((section) => (
        <Gutter key={section}>
          <SectionLabel className="pt-5 pb-2">
            {t.achievements.sections[section]}
          </SectionLabel>
          <BadgeGrid>
            {items
              .filter((a) => a.section === section)
              .map((a) => (
                <Badge
                  key={a.id}
                  icon={renderIcon(a.icon)}
                  title={a.title}
                  caption={a.caption}
                  unlocked={a.unlockedAt !== null}
                  highlight={a.id === latestId}
                />
              ))}
          </BadgeGrid>
        </Gutter>
      ))}
      <div className="pb-6" />
    </Screen>
  )
}
