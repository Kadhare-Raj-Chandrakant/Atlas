import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/shared/store/app-store'
import type { EntityDetail as EntityDetailType } from '@/core/memory/entities/types'
import { getEntityDetail } from '@/core/memory/entities/service'

interface EntityDetailProps {
  entityId: string
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function EntityDetail({ entityId }: EntityDetailProps) {
  const [detail, setDetail] = useState<EntityDetailType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useAppStore((s) => s.navigate)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getEntityDetail(entityId)
      .then(setDetail)
      .catch((err) => {
        console.error('EntityDetail error:', err)
        setError(`Failed to load entity details: ${String(err)}`)
      })
      .finally(() => setLoading(false))
  }, [entityId])

  const handleEntryClick = useCallback(
    (date: string) => {
      navigate('today', { date })
    },
    [navigate],
  )

  const handleBack = useCallback(() => {
    navigate('entities')
  }, [navigate])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-neutral-600">{error || 'Entity not found.'}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-6 py-8">
      <div className="shrink-0 space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-300"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5m7-7l-7 7 7 7" />
          </svg>
          Back to Entities
        </button>

        <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
          {detail.value}
        </h1>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">Type:</span>
            <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-300">
              {detail.entityType}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">Confidence:</span>
            <span className="text-neutral-300">
              {detail.confidence.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Referenced in
        </h2>
        {detail.entryDates.length === 0 ? (
          <p className="text-sm text-neutral-600">No references found.</p>
        ) : (
          <div className="space-y-0.5">
            {detail.entryDates.map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => handleEntryClick(date)}
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-neutral-400 transition-colors hover:bg-neutral-800/50 hover:text-neutral-100"
              >
                {formatDate(date)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
