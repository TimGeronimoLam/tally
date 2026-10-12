import { ComingSoon } from '../components/app/index.ts'
import { Screen, ScreenHeader } from '../components/ui/index.ts'

export function ChallengesPage() {
  return (
    <Screen>
      <ScreenHeader title="Challenges" />
      <ComingSoon />
    </Screen>
  )
}
