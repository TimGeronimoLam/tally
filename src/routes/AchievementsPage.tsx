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
  const { items, unlockedCount, total, latestId, loading } = useAchievements()

  // Catch up on anything earned outside the Log screen (imports, old data).
  useEffect(() => {
    void evaluateAchievements()
  }, [])

  if (loading) return null

  return (
    <Screen>
      <ScreenHeader
        title="Achievements"
        meta={`${unlockedCount} of ${total}`}
      />
      {SECTIONS.map((section) => (
        <Gutter key={section.id}>
          <SectionLabel className="pt-5 pb-2">{section.title}</SectionLabel>
          <BadgeGrid>
            {items
              .filter((a) => a.section === section.id)
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
