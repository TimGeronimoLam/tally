import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from './components/app/index.ts'
import { AccountPage } from './routes/AccountPage.tsx'
import { AchievementsPage } from './routes/AchievementsPage.tsx'
import { ChallengesPage } from './routes/ChallengesPage.tsx'
import { LogPage } from './routes/LogPage.tsx'
import { StatsPage } from './routes/StatsPage.tsx'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LogPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="settings" element={<Navigate to="/account" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
