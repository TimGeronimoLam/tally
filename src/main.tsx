import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './components/Toast.tsx'
import { seedIfNeeded } from './db/index.ts'

registerSW({ immediate: true })

const root = createRoot(document.getElementById('root')!)

seedIfNeeded()
  .catch((err) => console.error('seed failed', err))
  .finally(() => {
    root.render(
      <StrictMode>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </StrictMode>,
    )
  })
