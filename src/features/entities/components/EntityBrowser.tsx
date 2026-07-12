import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/shared/store/app-store'
import type { EntitySummary } from '@/core/memory/entities/types'
import { getEntities } from '@/core/memory/entities/service'

const GROUP_ORDER: string[] = [
  'Person', 'Project', 'Place', 'Idea', 'Task', 'Topic', 'Date',
]

const GROUP_LABELS: Record<string, string> = {
  Person: 'People',
  Project: 'Projects',
  Place: 'Places',
  Idea: 'Ideas',
  Task: 'Tasks',
  Topic: 'Topics',
  Date: 'Dates',
}

export function EntityBrowser() {
  const [allEntities, setAllEntities] = useState<EntitySummary[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useAppStore((s) => s.navigate)

  useEffect(() => {
    getEntities(searchQuery || undefined).then(setAllEntities)
  }, [searchQuery])

  const grouped = GROUP_ORDER
    .map((type) => ({
      type,
      label: GROUP_LABELS[type] || type,
      entities: allEntities.filter((e) => e.entityType === type),
    }))
    .filter((g) => g.entities.length > 0)

  const handleEntityClick = useCallback(
    (entityId: string) => {
      navigate('entity-detail', { entityId })
    },
    [navigate],
  )

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-6 py-8">
      <div className="shrink-0 space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
          Entities
        </h1>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entities..."
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="mt-6 flex-1 space-y-6 overflow-y-auto">
        {grouped.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-600">
              {searchQuery ? 'No entities found.' : 'No entities yet. Start writing to populate.'}
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.type}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {group.label}
              </h2>
              <div className="space-y-0.5">
                {group.entities.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => handleEntityClick(entity.id)}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-800/50 hover:text-neutral-100"
                  >
                    <span>{entity.value}</span>
                    <span className="text-xs text-neutral-600">
                      {entity.occurrenceCount}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
