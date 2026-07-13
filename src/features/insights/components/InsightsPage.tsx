import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@/shared/store/app-store'
import type { MemoryInsights, EntityInsightItem } from '../types'
import { getMemoryInsights } from '../services/insights-service'

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatStreak(streak: number): string {
  if (streak === 0) return 'No active streak'
  return `${streak} day${streak === 1 ? '' : 's'}`
}

interface EntityCardProps {
  item: EntityInsightItem
  onClick: (id: string) => void
}

function EntityCard({ item, onClick }: EntityCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm transition-colors hover:border-neutral-700 hover:bg-neutral-800/30"
    >
      <span className="text-neutral-200">{item.value}</span>
      <span className="ml-2 text-xs text-neutral-500">{item.count}</span>
    </button>
  )
}

interface StatCardProps {
  label: string
  value: string | number
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 transition-colors hover:border-neutral-700">
      <div className="text-2xl font-semibold text-neutral-100">{value}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{label}</div>
    </div>
  )
}

export function InsightsPage() {
  const [insights, setInsights] = useState<MemoryInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useAppStore((s) => s.navigate)

  useEffect(() => {
    getMemoryInsights()
      .then(setInsights)
      .finally(() => setLoading(false))
  }, [])

  const handleEntityClick = useCallback(
    (id: string) => {
      navigate('entity-detail', { entityId: id })
    },
    [navigate],
  )

  const handleEntryClick = useCallback(
    (date: string) => {
      navigate('today', { date })
    },
    [navigate],
  )

  const handleRelationshipEntityClick = useCallback(
    (entityId: string) => {
      navigate('entity-detail', { entityId })
    },
    [navigate],
  )

  const heatmapData = useMemo(() => {
    if (!insights) return []
    const today = new Date()
    const days: Array<{ date: string; count: number }> = []
    const activityMap = new Map(insights.dailyActivity.map((d) => [d.date, d.count]))

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      days.push({ date: dateStr, count: activityMap.get(dateStr) || 0 })
    }

    return days
  }, [insights])

  const totalDays = heatmapData.length
  const maxCount = Math.max(...heatmapData.map((d) => d.count), 1)

  function heatmapOpacity(count: number): string {
    if (count === 0) return 'bg-neutral-800'
    const intensity = Math.min(count / maxCount, 1)
    if (intensity > 0.66) return 'bg-primary-500'
    if (intensity > 0.33) return 'bg-primary-500/60'
    return 'bg-primary-500/30'
  }

  const weeks: typeof heatmapData[] = []
  for (let i = 0; i < totalDays; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7))
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
        <p className="text-sm text-neutral-500">Loading insights...</p>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="flex h-full items-center justify-center" role="alert">
        <p className="text-sm text-neutral-600">Failed to load insights.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
          Memory Insights
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Statistics and trends across your journal.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Activity Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Entries" value={insights.totalEntries} />
          <StatCard label="Total Entities" value={insights.totalEntities} />
          <StatCard label="Relationships" value={insights.totalRelationships} />
          <StatCard label="Days Written" value={insights.daysWritten} />
          <StatCard label="Current Streak" value={formatStreak(insights.currentStreak)} />
          <StatCard label="Longest Streak" value={formatStreak(insights.longestStreak)} />
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {insights.topPeople.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Top People
            </h2>
            <div className="space-y-1">
              {insights.topPeople.map((item) => (
                <EntityCard key={item.id} item={item} onClick={handleEntityClick} />
              ))}
            </div>
          </section>
        )}

        {insights.topPlaces.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Top Places
            </h2>
            <div className="space-y-1">
              {insights.topPlaces.map((item) => (
                <EntityCard key={item.id} item={item} onClick={handleEntityClick} />
              ))}
            </div>
          </section>
        )}

        {insights.topProjects.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Top Projects
            </h2>
            <div className="space-y-1">
              {insights.topProjects.map((item) => (
                <EntityCard key={item.id} item={item} onClick={handleEntityClick} />
              ))}
            </div>
          </section>
        )}

        {insights.topIdeas.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Top Ideas
            </h2>
            <div className="space-y-1">
              {insights.topIdeas.map((item) => (
                <EntityCard key={item.id} item={item} onClick={handleEntityClick} />
              ))}
            </div>
          </section>
        )}

        {insights.topTopics.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Frequently Mentioned Topics
            </h2>
            <div className="space-y-1">
              {insights.topTopics.map((item) => (
                <EntityCard key={item.id} item={item} onClick={handleEntityClick} />
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Writing Activity (Last 12 Months)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div
                    key={day.date}
                    className={`h-3 w-3 rounded-sm ${heatmapOpacity(day.count)}`}
                    title={`${formatDate(day.date)}: ${day.count} entr${day.count === 1 ? 'y' : 'ies'}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {insights.recentEntries.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Recent Activity
          </h2>
          <div className="space-y-1">
            {insights.recentEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleEntryClick(entry.date)}
                className="flex w-full flex-col gap-0.5 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-left text-sm transition-colors hover:border-neutral-700 hover:bg-neutral-800/30"
              >
                <span className="font-medium text-neutral-200">
                  {shortDate(entry.date)}
                </span>
                {entry.title && (
                  <span className="text-xs text-neutral-500">{entry.title}</span>
                )}
                <span className="line-clamp-1 text-xs text-neutral-600">
                  {entry.preview}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {insights.topRelationships.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Relationship Highlights
          </h2>
          <div className="space-y-1">
            {insights.topRelationships.map((rel, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 px-4 py-3 text-sm"
              >
                <button
                  type="button"
                  onClick={() => handleRelationshipEntityClick(rel.entityAId)}
                  className="text-neutral-200 transition-colors hover:text-primary-400"
                >
                  {rel.entityAValue}
                </button>
                <span className="text-neutral-600">↔</span>
                <button
                  type="button"
                  onClick={() => handleRelationshipEntityClick(rel.entityBId)}
                  className="text-neutral-200 transition-colors hover:text-primary-400"
                >
                  {rel.entityBValue}
                </button>
                <span className="ml-auto text-xs text-neutral-500">
                  {rel.weight}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Quick Statistics
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Avg Words / Entry" value={insights.avgWordsPerEntry.toFixed(1)} />
          <StatCard label="Avg Entities / Entry" value={insights.avgEntitiesPerEntry.toFixed(1)} />
          <StatCard label="Avg Relationships / Entry" value={insights.avgRelationshipsPerEntry.toFixed(1)} />
        </div>
      </section>
    </div>
  )
}
