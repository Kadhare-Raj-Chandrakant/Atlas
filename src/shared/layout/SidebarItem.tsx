import type { ReactNode } from 'react'

interface SidebarItemProps {
  icon: ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}

export function SidebarItem({ icon, label, active = false, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      className={`
        group flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium
        transition-all duration-150 ease-out
        ${active
          ? 'bg-primary-500/10 text-primary-400'
          : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100'
        }
      `}
    >
      <span
        className={`
          shrink-0 transition-colors duration-150
          ${active
            ? 'text-primary-400'
            : 'text-neutral-500 group-hover:text-neutral-100'
          }
        `}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}
