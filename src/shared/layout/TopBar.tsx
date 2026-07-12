import type { ReactNode } from 'react'

interface TopBarProps {
  children?: ReactNode
}

export function TopBar({ children }: TopBarProps) {
  return (
    <header className="flex h-10 shrink-0 items-center border-b border-neutral-800 bg-neutral-950/80 px-4 backdrop-blur-sm">
      {children}
    </header>
  )
}
