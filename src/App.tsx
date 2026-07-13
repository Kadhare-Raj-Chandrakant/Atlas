import { useCallback } from 'react'
import { AppShell, Sidebar, TopBar, MainContent, SidebarItem } from './shared/layout'
import { Logo, Icon } from './shared/ui'
import { TodayPage } from './features/editor'
import { EntityBrowser, EntityDetail } from './features/entities'
import { SearchPage } from './features/search'
import { MemoryExplorer } from './features/graph'
import { InsightsPage } from './features/insights'
import { useAppStore } from './shared/store/app-store'
import './features/editor/styles/editor.css'

const topNavItems = [
  { id: 'today', icon: 'journal' as const, label: 'Today' },
  { id: 'entities', icon: 'entity' as const, label: 'Entities' },
  { id: 'graph', icon: 'graph' as const, label: 'Memory Explorer' },
  { id: 'insights', icon: 'chart' as const, label: 'Memory Insights' },
  { id: 'search', icon: 'search' as const, label: 'Search' },
]

const PAGE_TRANSITIONS: Record<string, string> = {
  'today': 'animate-fade-in',
  'entities': 'animate-fade-in',
  'entity-detail': 'animate-fade-in',
  'search': 'animate-fade-in',
  'graph': 'animate-fade-in',
  'insights': 'animate-fade-in',
  'settings': 'animate-fade-in',
}

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
            <Logo size={18} className="text-primary-400" aria-hidden="true" />
            <span className="text-sm font-semibold tracking-tight text-neutral-100">
              Atlas
            </span>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Main navigation">
            {topNavItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={<Icon name={item.icon} size={18} aria-hidden="true" />}
                label={item.label}
                active={activeView === item.id}
                onClick={() => handleNavClick(item.id)}
              />
            ))}
          </nav>

          <div className="border-t border-neutral-800 p-2">
            <SidebarItem
              icon={<Icon name="settings" size={18} aria-hidden="true" />}
              label="Settings"
              active={activeView === 'settings'}
              onClick={() => handleNavClick('settings')}
            />
          </div>
        </Sidebar>
        <MainContent>
          <div key={activeView} className={PAGE_TRANSITIONS[activeView] || 'animate-fade-in'}>
            {activeView === 'today' && (
              <TodayPage key={`today-${params.date || 'now'}`} initialDate={params.date} />
            )}
            {activeView === 'entities' && <EntityBrowser />}
            {activeView === 'entity-detail' && (
              <EntityDetail entityId={params.entityId || ''} />
            )}
            {activeView === 'search' && <SearchPage />}
            {activeView === 'graph' && <MemoryExplorer />}
            {activeView === 'insights' && <InsightsPage />}
            {activeView === 'settings' && (
              <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center px-6 py-8">
                <div className="space-y-4 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
                    Settings
                  </h1>
                  <p className="text-sm text-neutral-600">
                    Atlas runs entirely locally with no cloud dependency.
                  </p>
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-6 py-4 text-left text-sm text-neutral-400">
                    <p>Version: 1.0.0</p>
                    <p className="mt-1">Database: SQLite (local)</p>
                    <p className="mt-1">All data stays on your device.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </MainContent>
      </div>
    </AppShell>
  )
}
