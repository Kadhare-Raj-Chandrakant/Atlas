import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAppStore } from '@/shared/store/app-store'
import type { SearchResults, EntrySearchResult, EntitySearchResult } from '../types'
import { searchAll } from '../services/search-service'

const ENTITY_GROUP_ORDER = ['Person', 'Project', 'Place', 'Idea', 'Task', 'Topic', 'Date']

const ENTITY_GROUP_LABELS: Record<string, string> = {
  Person: 'People',
  Project: 'Projects',
  Place: 'Places',
  Idea: 'Ideas',
  Task: 'Tasks',
  Topic: 'Topics',
  Date: 'Dates',
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightText(text: string, query: string): (string | { highlight: string })[] {
  if (!query) return [text]
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part) => {
    if (part.toLowerCase() === query.toLowerCase()) {
      return { highlight: part }
    }
    return part
  })
}

interface EntityFlatItem {
  kind: 'entity'
  index: number
  id: string
  value: string
  entityType: string
  occurrenceCount: number
}

interface EntryFlatItem {
  kind: 'entry'
  index: number
  id: string
  value: string
  date: string
}

type FlatItem = EntityFlatItem | EntryFlatItem

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [searching, setSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const navigate = useAppStore((s) => s.navigate)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 180)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    setSelectedIndex(0)
    searchAll(debouncedQuery)
      .then(setResults)
      .catch(() => setResults({ entities: [], entries: [] }))
      .finally(() => setSearching(false))
  }, [debouncedQuery])

  const flatItems = useMemo(() => {
    if (!results) return []
    const items: FlatItem[] = []
    let index = 0

    for (const groupType of ENTITY_GROUP_ORDER) {
      const group = results.entities.filter((e) => e.entityType === groupType)
      for (const entity of group) {
        items.push({
          kind: 'entity',
          index,
          id: entity.id,
          value: entity.value,
          entityType: entity.entityType,
          occurrenceCount: entity.occurrenceCount,
        })
        index++
      }
    }

    for (const entry of results.entries) {
      items.push({
        kind: 'entry',
        index,
        id: entry.id,
        value: entry.date,
        date: entry.date,
      })
      index++
    }

    return items
  }, [results])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (flatItems.length === 0) return

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1))
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        }
        case 'Enter': {
          e.preventDefault()
          const item = flatItems[selectedIndex]
          if (!item) return
          if (item.kind === 'entity') {
            navigate('entity-detail', { entityId: item.id })
          } else {
            const entryResult = results?.entries.find((e) => e.id === item.id)
            if (entryResult) {
              navigate('today', { date: entryResult.date })
            }
          }
          break
        }
        case 'Escape': {
          e.preventDefault()
          setQuery('')
          inputRef.current?.blur()
          break
        }
      }
    },
    [flatItems, selectedIndex, navigate, results],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
    },
    [],
  )

  const handleEntryClick = useCallback(
    (entry: EntrySearchResult) => {
      navigate('today', { date: entry.date })
    },
    [navigate],
  )

  const handleEntityClick = useCallback(
    (entity: EntitySearchResult) => {
      navigate('entity-detail', { entityId: entity.id })
    },
    [navigate],
  )

  function renderPreview(text: string, q: string): React.ReactNode {
    const segments = highlightText(text, q)
    return segments.map((seg, i) => {
      if (typeof seg === 'string') return seg
      return (
        <mark key={i} className="rounded-sm bg-primary-500/20 text-primary-300">
          {seg.highlight}
        </mark>
      )
    })
  }

  function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const hasResults =
    results &&
    (results.entities.length > 0 || results.entries.length > 0)

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-6 py-8">
      <div className="shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search memories, people, places, projects..."
          aria-label="Search"
          aria-controls="search-results"
          aria-activedescendant={flatItems[selectedIndex] ? `search-item-${selectedIndex}` : undefined}
          className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-3.5 text-base text-neutral-100 placeholder-neutral-600 outline-none transition-colors focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          autoFocus
        />
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        {searching && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-500">Searching...</p>
          </div>
        )}

        {!searching && !query && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-600">
              Type to search across all your entries and entities.
            </p>
          </div>
        )}

        {!searching && query && !hasResults && results && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-neutral-600">
              No results for &ldquo;{query}&rdquo;
            </p>
          </div>
        )}

        {!searching && hasResults && (
          <div
            id="search-results"
            ref={resultsRef}
            role="listbox"
            aria-label="Search results"
            className="space-y-6"
            onKeyDown={handleKeyDown}
          >
            {ENTITY_GROUP_ORDER.map((groupType) => {
              const group = results!.entities.filter(
                (e) => e.entityType === groupType,
              )
              if (group.length === 0) return null

              return (
                <section key={groupType}>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {ENTITY_GROUP_LABELS[groupType] || groupType}
                  </h2>
                  <div className="space-y-0.5">
                    {group.map((entity) => {
                      const flat = flatItems.find(
                        (f) => f.kind === 'entity' && f.id === entity.id,
                      )
                      const isSelected =
                        flat && flatItems[selectedIndex] === flat

                      return (
                        <button
                          key={entity.id}
                          id={`search-item-${flat?.index}`}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleEntityClick(entity)}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                            isSelected
                              ? 'bg-primary-500/10 text-primary-300'
                              : 'text-neutral-300 hover:bg-neutral-800/50 hover:text-neutral-100'
                          }`}
                        >
                          <span>
                            {renderPreview(entity.value, debouncedQuery)}
                          </span>
                          <span className="text-xs text-neutral-600">
                            {entity.occurrenceCount}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )
            })}

            {results!.entries.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Entries
                </h2>
                <div className="space-y-1">
                  {results!.entries.map((entry) => {
                    const flat = flatItems.find(
                      (f) => f.kind === 'entry' && f.id === entry.id,
                    )
                    const isSelected =
                      flat && flatItems[selectedIndex] === flat

                    return (
                      <button
                        key={entry.id}
                        id={`search-item-${flat?.index}`}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleEntryClick(entry)}
                        className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? 'bg-primary-500/10'
                            : 'hover:bg-neutral-800/50'
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            isSelected
                              ? 'text-primary-300'
                              : 'text-neutral-300'
                          }`}
                        >
                          {formatDate(entry.date)}
                        </span>
                        {entry.title && (
                          <span className="text-xs text-neutral-500">
                            {entry.title}
                          </span>
                        )}
                        <span className="line-clamp-2 text-xs text-neutral-600">
                          {renderPreview(entry.preview, debouncedQuery)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
