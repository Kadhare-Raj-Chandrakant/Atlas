import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '@/shared/store/app-store'
import { searchAll } from '@/features/search/services/search-service'
import { getRelatedEntities as fetchRelatedEntities } from '../services/graph-service'
import type { RelatedEntitiesResponse } from '../types'
import { GraphCanvas } from './GraphCanvas'

export function MemoryExplorer() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ id: string; value: string; entityType: string }>>([])
  const [graphData, setGraphData] = useState<RelatedEntitiesResponse | null>(null)
  const [selectedEntityName, setSelectedEntityName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useAppStore((s) => s.navigate)

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      const results = await searchAll(query)
      const entities = results.entities.map((e) => ({
        id: e.id,
        value: e.value,
        entityType: e.entityType,
      }))
      setSuggestions(entities)
    }, 180)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelectEntity = useCallback(async (entityId: string) => {
    setQuery('')
    setSuggestions([])
    setLoading(true)
    setError(null)

    try {
      const data = await fetchRelatedEntities(entityId)
      if (!data || data.related.length === 0) {
        if (!graphData) {
          setError('No connected memories found.')
          setGraphData(null)
        }
      } else {
        setSelectedEntityName(data.center.value)
        setGraphData(data)
      }
    } catch (err) {
      console.error('MemoryExplorer error:', err)
      if (!graphData) {
        setError(`Failed to load relationships: ${String(err)}`)
        setGraphData(null)
      }
    } finally {
      setLoading(false)
    }
  }, [graphData])

  const handleNodeClick = useCallback(
    async (entityId: string) => {
      await handleSelectEntity(entityId)
    },
    [handleSelectEntity],
  )

  const handleNodeDoubleClick = useCallback(
    (entityId: string) => {
      navigate('entity-detail', { entityId })
    },
    [navigate],
  )

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col px-6 py-8">
      <div className="shrink-0 space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
          Memory Explorer
        </h1>
        <p className="text-sm text-neutral-600">
          Search for a memory, person, place, project, idea or topic.
        </p>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entities..."
            aria-label="Search entities for graph"
            aria-autocomplete="list"
            aria-controls="graph-suggestions"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          {suggestions.length > 0 && (
            <div
              id="graph-suggestions"
              role="listbox"
              aria-label="Entity suggestions"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl"
            >
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  onClick={() => handleSelectEntity(s.id)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-800"
                >
                  <span className="text-xs text-neutral-500">{s.entityType}</span>
                  <span>{s.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50">
        {!graphData && !loading && !error && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-600">
              {selectedEntityName
                ? 'No connected memories found.'
                : 'Search for an entity above to explore its connections.'}
            </p>
          </div>
        )}

        {loading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-500">Loading...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-600">{error}</p>
          </div>
        )}

        {graphData && !loading && (
          <GraphCanvas
            data={graphData}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
          />
        )}
      </div>
    </div>
  )
}
