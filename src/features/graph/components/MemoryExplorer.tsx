import { useState, useCallback, useEffect } from 'react'
import { useAppStore } from '@/shared/store/app-store'
import { searchAll } from '@/features/search/services/search-service'
import {
  getRelatedEntities as fetchRelatedEntities,
  getGlobalGraph as fetchGlobalGraph,
} from '../services/graph-service'
import type { RelatedEntitiesResponse, GlobalGraphResponse } from '../types'
import { GraphCanvas } from './GraphCanvas'

interface MemoryExplorerProps {
  initialMode?: 'global' | 'neighborhood'
}

export function MemoryExplorer({ initialMode = 'global' }: MemoryExplorerProps = {}) {
  const [mode, setMode] = useState<'global' | 'neighborhood'>(initialMode)
  const [globalGraphData, setGlobalGraphData] = useState<GlobalGraphResponse | null>(null)
  const [graphData, setGraphData] = useState<RelatedEntitiesResponse | null>(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Array<{ id: string; value: string; entityType: string }>>([])
  const [selectedEntityName, setSelectedEntityName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useAppStore((s) => s.navigate)

  useEffect(() => {
    let isMounted = true
    if (mode === 'global') {
      async function loadGlobal() {
        setLoading(true)
        setError(null)
        try {
          const gData = await fetchGlobalGraph()
          if (isMounted) {
            setGlobalGraphData(gData)
          }
        } catch (err) {
          console.error('Failed to load global graph:', err)
          if (isMounted) {
            setError(`Failed to load global graph: ${String(err)}`)
          }
        } finally {
          if (isMounted) setLoading(false)
        }
      }
      loadGlobal()
    }
    return () => {
      isMounted = false
    }
  }, [initialMode, mode])

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
        // If entity has no related items, still show it centered if we have it
        if (data && data.center) {
          setSelectedEntityName(data.center.value)
          setGraphData(data)
          setMode('neighborhood')
        } else {
          setError('No connected memories found.')
        }
      } else {
        setSelectedEntityName(data.center.value)
        setGraphData(data)
        setMode('neighborhood')
      }
    } catch (err) {
      console.error('MemoryExplorer error:', err)
      setError(`Failed to load relationships: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [])

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
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-neutral-950">
      {/* Floating Header / Search Overlay at Top-Left */}
      <div className="absolute left-6 top-6 z-20 w-80 max-w-[calc(100vw-3rem)]">
        <div className="flex items-center gap-2 mb-2">
          {mode === 'neighborhood' ? (
            <button
              type="button"
              onClick={() => {
                setMode('global')
                setQuery('')
                setError(null)
              }}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/90 px-3 py-1.5 text-xs font-medium text-neutral-200 shadow-lg backdrop-blur-md transition-colors hover:bg-neutral-800 hover:text-white"
            >
              ← Back to Global Graph {selectedEntityName && <span className="text-primary-400 font-semibold">({selectedEntityName})</span>}
            </button>
          ) : null}
        </div>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dots & entities..."
            aria-label="Search entities for graph"
            aria-autocomplete="list"
            aria-controls="graph-suggestions"
            className="w-full rounded-xl border border-neutral-800/80 bg-neutral-900/85 px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 shadow-2xl backdrop-blur-md outline-none transition-all focus:border-neutral-600 focus:bg-neutral-900 focus:ring-1 focus:ring-neutral-600"
          />
          {suggestions.length > 0 && (
            <div
              id="graph-suggestions"
              role="listbox"
              aria-label="Entity suggestions"
              className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900/95 shadow-2xl backdrop-blur-md"
            >
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  onClick={() => handleSelectEntity(s.id)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-800/80"
                >
                  <span className="text-xs text-neutral-500">{s.entityType}</span>
                  <span>{s.value}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Edge-to-Edge Graph Canvas without any border or box */}
      <div className="flex flex-1 w-full h-full relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm">
            <p className="text-sm font-medium text-neutral-300">Loading graph...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-400">{error}</p>
          </div>
        )}

        {mode === 'global' && globalGraphData && !loading && !error && (
          globalGraphData.nodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6">
              <p className="text-base font-medium text-neutral-400">Your Knowledge Graph is empty</p>
              <p className="mt-1 text-sm text-neutral-600">
                Create journal entries in the Today tab to start building entities and connections automatically.
              </p>
            </div>
          ) : (
            <GraphCanvas
              globalData={globalGraphData}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
            />
          )
        )}

        {mode === 'neighborhood' && graphData && !loading && !error && (
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
