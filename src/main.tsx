import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/app/ErrorBoundary.tsx'
import { ToastProvider } from './components/ui/index.ts'
import { seedIfNeeded } from './db/index.ts'
import { installErrorCapture, recordError } from './lib/diagnostics.ts'
import { initTheme } from './lib/theme.ts'
import { initAuth, startSyncTriggers } from './sync/index.ts'

installErrorCapture()
registerSW({ immediate: true })
initTheme()

const root = createRoot(document.getElementById('root')!)
let started = false

/**
 * Render, then let auth and sync loose. Sync starts only after the seed
 * transaction has settled so the two never queue on the same tables at
 * startup, and nothing network-bound can delay first paint.
 */
function start() {
  if (started) return
  started = true
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>,
  )
  initAuth()
  startSyncTriggers()
}

// If the local database does not answer, render anyway: every screen copes
// with data still loading, whereas a blank page cannot even be reloaded
// from inside an installed app.
const watchdog = window.setTimeout(() => {
  recordError('startup', new Error('Local database slow to open at launch'))
  start()
}, 4000)

seedIfNeeded()
  .catch((err) => recordError('seed', err))
  .finally(() => {
    window.clearTimeout(watchdog)
    start()
  })
