import { useCallback } from 'react'
import { AppShell, Sidebar, TopBar, MainContent, SidebarItem } from './shared/layout'
import { Logo, Icon } from './shared/ui'
import { TodayPage } from './features/editor'
import { EntityBrowser, EntityDetail } from './features/entities'
import { useAppStore } from './shared/store/app-store'
import './features/editor/styles/editor.css'

const topNavItems = [
  { id: 'today', icon: 'journal' as const, label: 'Today' },
  { id: 'journal', icon: 'home' as const, label: 'Journal' },
  { id: 'entities', icon: 'entity' as const, label: 'Entities' },
  { id: 'timeline', icon: 'timeline' as const, label: 'Timeline' },
  { id: 'search', icon: 'search' as const, label: 'Search' },
]

export function App() {
  const { activeView, params, navigate } = useAppStore()

  const handleNavClick = useCallback(
    (id: string) => {
      navigate(id)
    },
    [navigate],
  )

  return (
    <AppShell>
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <div className="flex h-10 shrink-0 items-center gap-2.5 border-b border-neutral-800 px-4">
            <Logo size={18} className="text-primary-400" />
            <span className="text-sm font-semibold tracking-tight text-neutral-100">
              Atlas
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 p-2">
            {topNavItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={<Icon name={item.icon} size={18} />}
                label={item.label}
                active={activeView === item.id}
                onClick={() => handleNavClick(item.id)}
              />
            ))}
          </nav>

          <div className="border-t border-neutral-800 p-2">
            <SidebarItem
              icon={<Icon name="settings" size={18} />}
              label="Settings"
              active={activeView === 'settings'}
              onClick={() => handleNavClick('settings')}
            />
          </div>
        </Sidebar>
        <MainContent>
          {activeView === 'today' && (
            <TodayPage key={`today-${params.date || 'now'}`} initialDate={params.date} />
          )}
          {activeView === 'entities' && <EntityBrowser />}
          {activeView === 'entity-detail' && (
            <EntityDetail entityId={params.entityId || ''} />
          )}
        </MainContent>
      </div>
    </AppShell>
  )
}
