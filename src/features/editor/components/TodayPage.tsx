import { useState, useCallback, useEffect, useRef } from 'react'
import type { Entry } from '@/core/memory'
import {
  saveEntry,
  loadEntryByDate,
} from '@/core/memory/entry-service'
import { useAutosave } from '../hooks/useAutosave'
import { Editor } from './Editor'
import { EditorFooter } from './EditorFooter'
import { DateNavigation } from './DateNavigation'
import { Icon } from '@/shared/ui'

function createEntryForDate(dateStr: string): Entry {
  const now = new Date()
  const id = crypto.randomUUID()

  return {
    id,
    date: dateStr,
    content: '',
    metadata: {
      id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      wordCount: 0,
      charCount: 0,
    },
  }
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0]
}

interface TodayPageProps {
  initialDate?: string
}

export function TodayPage({ initialDate }: TodayPageProps) {
  const todayStr = initialDate || new Date().toISOString().split('T')[0]
  const [currentDate, setCurrentDate] = useState(todayStr)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [charCount, setCharCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentDateRef = useRef(currentDate)
  currentDateRef.current = currentDate

  const { markDirty, saveNow, isSaving, lastSaved } = useAutosave({
    onSave: useCallback(
      async (content: string) => {
        if (!entry) return
        const now = new Date().toISOString()
        await saveEntry({
          ...entry,
          content,
          metadata: { ...entry.metadata, updatedAt: now, charCount },
        })
      },
      [entry, charCount],
    ),
  })

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadEntryByDate(currentDate)
      .then((existing) => {
        if (existing) {
          setEntry(existing)
          setCharCount(existing.metadata.charCount)
        } else {
          setEntry(createEntryForDate(currentDate))
          setCharCount(0)
        }
      })
      .catch((err) => {
        console.error('TodayPage error:', err)
        setError(`Failed to load entry: ${String(err)}`)
        setEntry(createEntryForDate(currentDate))
      })
      .finally(() => setLoading(false))
  }, [currentDate])

  const navigateToDate = useCallback(
    async (newDate: string) => {
      if (newDate === currentDateRef.current) return
      await saveNow()
      setCurrentDate(newDate)
    },
    [saveNow],
  )

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        const [y, m, d] = currentDateRef.current.split('-').map(Number)
        const prev = new Date(y, m - 1, d - 1)
        navigateToDate(prev.toISOString().split('T')[0])
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        const [y, m, d] = currentDateRef.current.split('-').map(Number)
        const next = new Date(y, m - 1, d + 1)
        navigateToDate(next.toISOString().split('T')[0])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [navigateToDate])

  const handleEditorUpdate = useCallback(
    (html: string, chars: number) => {
      setCharCount(chars)
      markDirty(html)
    },
    [markDirty],
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Icon name="journal" size={24} className="animate-pulse text-neutral-700" />
      </div>
    )
  }

  if (error && !entry) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center">
        <p className="text-sm text-neutral-600">{error}</p>
        <p className="text-xs text-neutral-700">Start writing a new entry for today.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-2xl flex-col px-6 py-8">
      <div className="shrink-0 space-y-3">
        <DateNavigation
          currentDate={currentDate}
          onSelectDate={navigateToDate}
        />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
            {isToday(currentDate)
              ? 'What happened today?'
              : 'What happened on this day?'}
          </h1>
          <p className="text-sm leading-relaxed text-neutral-600">
            Write naturally. Atlas will organize everything for you.
          </p>
        </div>
      </div>

      <div key={currentDate} className="mt-8 flex-1 animate-fade-in-up">
        <Editor content={entry!.content} onUpdate={handleEditorUpdate} />
      </div>

      <div className="mt-4 shrink-0">
        <EditorFooter
          charCount={charCount}
          isSaving={isSaving}
          lastSaved={lastSaved}
        />
      </div>
    </div>
  )
}
