import { invoke } from '@tauri-apps/api/core'
import type { EntryRef } from './retrieval-service'

interface SearchResultsPayload {
  entries: Array<{
    id: string
    date: string
    title: string
    preview: string
  }>
  entities: Array<{
    id: string
    entityType: string
    value: string
    occurrenceCount: number
  }>
}

export async function searchAll(keyword: string): Promise<EntryRef[]> {
  const result = await invoke<SearchResultsPayload>('search_all', { query: keyword })
  return result.entries.map((e) => ({
    id: e.id,
    date: e.date,
    contentText: e.preview,
  }))
}
