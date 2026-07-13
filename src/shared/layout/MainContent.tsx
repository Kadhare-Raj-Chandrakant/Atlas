import type { ReactNode } from 'react'
import { Logo } from '../ui'

interface MainContentProps {
  children?: ReactNode
}

export function MainContent({ children }: MainContentProps) {
  if (children) {
    return <main className="min-w-0 flex flex-1 flex-col overflow-hidden bg-neutral-900 relative">{children}</main>
  }

  return (
    <main className="min-w-0 flex flex-1 items-center justify-center bg-neutral-900">
      <div className="flex flex-col items-center gap-6 px-4 text-center">
        <div className="animate-fade-in">
          <Logo
            size={48}
            className="text-primary-500/60"
          />
        </div>

        <div className="space-y-2">
          <h1
            className="animate-fade-in-up text-2xl font-semibold tracking-tight text-neutral-100"
            style={{ animationDelay: '150ms' }}
          >
            Welcome to Atlas
          </h1>
          <p
            className="animate-fade-in-up text-base leading-relaxed text-neutral-500"
            style={{ animationDelay: '300ms' }}
          >
            Write naturally.
            <br />
            <span className="text-primary-400/80">Atlas remembers everything else.</span>
          </p>
        </div>

        <div
          className="animate-fade-in"
          style={{ animationDelay: '500ms' }}
        >
          <div className="flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/50 px-4 py-1.5">
            <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-primary-500" />
            <span className="text-xs font-medium text-neutral-500">
              Ready
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
