import type { ReactNode } from 'react'

interface SidebarProps {
  children?: ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950">
      {children}
    </aside>
  )
}
