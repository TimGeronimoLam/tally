import { Component, type ErrorInfo, type ReactNode } from 'react'
import { messages } from '../../i18n/index.ts'
import { recordError } from '../../lib/diagnostics.ts'
import { Button } from '../ui/index.ts'

interface State {
  error: Error | null
}

/**
 * Last line of defence: a render error would otherwise unmount the whole
 * tree and leave a blank screen with nothing to tap. Shows the message and
 * a reload button instead, and remembers the error for the Account screen.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordError('render', error)
    console.error(info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    // A class component cannot use the hook; the language will not change
    // while this screen is up anyway.
    const t = messages().errorBoundary
    return (
      <div className="mx-auto flex h-full w-full max-w-app flex-col justify-center gap-4 px-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
          {t.title}
        </h1>
        <p className="text-[15px] text-muted">{t.body}</p>
        <pre className="overflow-x-auto rounded-xl bg-surface p-3 text-xs break-words whitespace-pre-wrap text-faint select-text">
          {error.name}: {error.message}
        </pre>
        <Button size="lg" fullWidth onClick={() => window.location.reload()}>
          {t.reload}
        </Button>
      </div>
    )
  }
}
