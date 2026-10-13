import {
  Navigate,
  Route,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router'
import { AppShell } from './components/app/index.ts'
import { AccountPage } from './routes/AccountPage.tsx'
import { AchievementsPage } from './routes/AchievementsPage.tsx'
import { ChallengeDetailPage } from './routes/ChallengeDetailPage.tsx'
import { ChallengesPage } from './routes/ChallengesPage.tsx'
import { EditChallengePage } from './routes/EditChallengePage.tsx'
import { JoinPage } from './routes/JoinPage.tsx'
import { LogPage } from './routes/LogPage.tsx'
import { NewChallengePage } from './routes/NewChallengePage.tsx'
import { StatsPage } from './routes/StatsPage.tsx'

/**
 * A data router rather than `<BrowserRouter>`: only the data router runs
 * view transitions (the slide between screens, see src/lib/nav.ts), and it
 * replays them on browser back and forward.
 */
export const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route element={<AppShell />}>
        <Route index element={<LogPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="challenges/:id" element={<ChallengeDetailPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="settings" element={<Navigate to="/account" replace />} />
      </Route>
      {/* Full-screen flows without the tab bar. */}
      <Route element={<AppShell tabs={false} />}>
        <Route path="challenges/new" element={<NewChallengePage />} />
        <Route path="challenges/:id/edit" element={<EditChallengePage />} />
        <Route path="join/:code" element={<JoinPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </>,
  ),
)
