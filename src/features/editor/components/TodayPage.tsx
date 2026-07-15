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
import { ConversationEmptyState } from './ConversationMode'
import { ConversationToggle } from './ConversationToggle'
import { useCoWriterStore } from '../store'
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
  const [previousNotesHtml, setPreviousNotesHtml] = useState<string | null>(null)
  const [charCount, setCharCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentDateRef = useRef(currentDate)
  currentDateRef.current = currentDate
  const initialDayContentRef = useRef<string | null>(null)

  const mode = useCoWriterStore((s) => s.mode)
  const isWriting = useCoWriterStore((s) => s.isWriting)
  const isProcessing = useCoWriterStore((s) => s.isProcessing)
  const messages = useCoWriterStore((s) => s.messages)
  const editor = useCoWriterStore((s) => s.editor)
  const syncConversationSurface = useCoWriterStore((s) => s.syncConversationSurface)
  const sendMessage = useCoWriterStore((s) => s.sendMessage)
  const prevModeRef = useRef(mode)

  const { markDirty, saveNow, isSaving, lastSaved } = useAutosave({
    onSave: useCallback(
      async (content: string) => {
        if (!entry) return
        if (!content.trim() && !initialDayContentRef.current) return
        const now = new Date().toISOString()
        const combinedContent = initialDayContentRef.current && initialDayContentRef.current.trim() !== ''
          ? `${initialDayContentRef.current}<hr class="my-6 border-neutral-800" />${content}`
          : content

        await saveEntry({
          ...entry,
          content: combinedContent,
          metadata: { ...entry.metadata, updatedAt: now, charCount: combinedContent.length },
        })
      },
      [entry],
    ),
  })

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadEntryByDate(currentDate)
      .then((existing) => {
        if (existing && existing.content && existing.content.trim() !== '') {
          initialDayContentRef.current = existing.content
          setPreviousNotesHtml(existing.content)
          const newEntry = createEntryForDate(currentDate)
          newEntry.id = existing.id
          setEntry(newEntry)
          setCharCount(0)
        } else {
          initialDayContentRef.current = null
          setPreviousNotesHtml(null)
          setEntry(createEntryForDate(currentDate))
          setCharCount(0)
        }
      })
      .catch((err) => {
        console.error('TodayPage error:', err)
        setError(`Failed to load entry: ${String(err)}`)
        initialDayContentRef.current = null
        setPreviousNotesHtml(null)
        setEntry(createEntryForDate(currentDate))
      })
      .finally(() => setLoading(false))
  }, [currentDate])

  const navigateToDate = useCallback(
    async (newDate: string) => {
      if (newDate === currentDateRef.current) return
      // Persist the current entry, but never let a save failure trap the user on
      // the wrong day — navigation must always proceed.
      await saveNow().catch(() => {})
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
      // In Shared Notebook mode the editor holds the live conversation, not the
      // journal entry — never let that streamed transcript autosave over the day's
      // notes. The conversation is transient; the journal entry stays intact.
      if (useCoWriterStore.getState().mode === 'conversation') return
      markDirty(html)
    },
    [markDirty],
  )

  // Release 22 — Shared Notebook: the editor itself is the conversation surface.
  // When entering conversation mode, render the existing turns into the live
  // document; leaving it lets the editor restore the journal (handled in Editor).
  useEffect(() => {
    if (editor && mode === 'conversation' && prevModeRef.current !== 'conversation') {
      syncConversationSurface()
    }
    prevModeRef.current = mode
  }, [mode, editor, syncConversationSurface])

  // Commit the current paragraph as a turn when the user presses Enter (without
  // Shift) inside the editor while talking with Atlas. Shift+Enter stays a newline.
  useEffect(() => {
    if (mode !== 'conversation') return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.shiftKey) return
      const target = e.target as HTMLElement | null
      if (!target || !target.closest || !target.closest('.ProseMirror')) return
      if (useCoWriterStore.getState().isWriting || useCoWriterStore.getState().isProcessing) return
      const ed = useCoWriterStore.getState().editor
      if (!ed) return
      const text = ed.state.selection.$from.parent.textContent.trim()
      if (!text) return
      e.preventDefault()
      void sendMessage(text)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, sendMessage])

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
            {mode === 'conversation'
              ? 'What’s on your mind?'
              : isToday(currentDate)
                ? 'What happened today?'
                : 'What happened on this day?'}
          </h1>
          <p className="text-sm leading-relaxed text-neutral-600">
            {mode === 'conversation'
              ? 'Talk with Atlas as you write — it replies right here in your journal.'
              : 'Write naturally. Atlas will organize everything for you.'}
          </p>
        </div>
      </div>

      <div key={currentDate} className="relative mt-8 min-h-0 flex-1">
        {/* A single living surface. In journal mode it holds the day's entry; in
            conversation mode the store renders the shared notebook (Atlas replies
            inline). The inner region scrolls so the editor always reserves space and
            the footer can never be overlapped by the journal. One document, no
            separate chat panel. */}
        <div className="h-full overflow-y-auto pr-1">
          <Editor content={entry!.content} onUpdate={handleEditorUpdate} />

          {mode !== 'conversation' && previousNotesHtml && (
            <div className="mt-10 border-t border-neutral-800/80 pt-6">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                <Icon name="journal" size={14} className="text-primary-400" />
                <span>Earlier notes from today ({new Date(currentDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})</span>
              </div>
              <div
                className="prose prose-invert max-w-none text-sm text-neutral-400 opacity-85 space-y-2"
                dangerouslySetInnerHTML={{ __html: previousNotesHtml }}
              />
            </div>
          )}
        </div>

        {mode === 'conversation' && messages.length === 0 && !isWriting && !isProcessing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <ConversationEmptyState />
          </div>
        )}

        <ConversationToggle />
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
