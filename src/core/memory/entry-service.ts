import { invoke } from '@tauri-apps/api/core'
import type { Entry } from './entry'
import { stripHtml } from './normalization'
import { processEntry } from './pipeline'

interface EntryPayload {
  id: string
  createdAt: string
  updatedAt: string
  date: string
  title: string
  contentHtml: string
  contentText: string
}

export async function saveEntry(entry: Entry): Promise<void> {
  const payload: EntryPayload = {
    id: entry.id,
    createdAt: entry.metadata.createdAt,
    updatedAt: entry.metadata.updatedAt,
    date: entry.date,
    title: '',
    contentHtml: entry.content,
    contentText: stripHtml(entry.content),
  }
  await invoke('save_entry', { entry: payload })

  processEntry(entry).catch(() => {})
}

export async function getDatesWithEntries(
  year: number,
  month: number,
): Promise<string[]> {
  return invoke<string[]>('get_dates_with_entries', { year, month })
}

export async function loadEntryByDate(date: string): Promise<Entry | null> {
  const result = await invoke<EntryPayload | null>('load_entry_by_date', { date })
  if (!result) return null
  const charCount = result.contentText.length
  const wordCount = result.contentText ? result.contentText.trim().split(/\s+/).length : 0
  return {
    id: result.id,
    date: result.date,
    content: result.contentHtml,
    metadata: {
      id: result.id,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      wordCount,
      charCount,
    },
  }
}
