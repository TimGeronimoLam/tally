import { ComingSoon } from '../components/app/index.ts'
import { Screen, ScreenHeader } from '../components/ui/index.ts'

export function StatsPage() {
  return (
    <Screen>
      <ScreenHeader title="Stats" />
      <ComingSoon />
    </Screen>
  )
}
