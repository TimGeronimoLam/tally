import { ComingSoon } from '../components/app/index.ts'
import { Screen, ScreenHeader } from '../components/ui/index.ts'

export function AchievementsPage() {
  return (
    <Screen>
      <ScreenHeader title="Achievements" />
      <ComingSoon />
    </Screen>
  )
}
