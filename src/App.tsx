import { Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout.tsx'
import { AchievementsPage } from './routes/AchievementsPage.tsx'
import { ChallengesPage } from './routes/ChallengesPage.tsx'
import { LogPage } from './routes/LogPage.tsx'
import { SettingsPage } from './routes/SettingsPage.tsx'
import { StatsPage } from './routes/StatsPage.tsx'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<LogPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
