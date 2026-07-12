import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-neutral-950 text-neutral-100 antialiased selection:bg-primary-500 selection:text-white">
      {children}
    </div>
  )
}
