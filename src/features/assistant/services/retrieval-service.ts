import { invoke } from '@tauri-apps/api/core'

interface EntryPayload {
  id: string
  createdAt: string
  updatedAt: string
  date: string
  title: string
  contentHtml: string
  contentText: string
}

export interface EntryRef {
  id: string
  date: string
  contentText: string
}

function toEntryRef(p: EntryPayload): EntryRef {
  return { id: p.id, date: p.date, contentText: p.contentText.slice(0, 500) }
}

export async function findEntryByDate(date: string): Promise<EntryRef | null> {
  const result = await invoke<EntryPayload | null>('load_entry_by_date', { date })
  return result ? toEntryRef(result) : null
}

export async function findEntriesBetweenDates(from: string, to: string): Promise<EntryRef[]> {
  const result = await invoke<EntryPayload[]>('find_entries_between_dates', { fromDate: from, toDate: to })
  return result.map(toEntryRef)
}

export async function findRecentEntries(days: number): Promise<EntryRef[]> {
  const result = await invoke<EntryPayload[]>('find_recent_entries', { days })
  return result.map(toEntryRef)
}

export async function findEntriesByEntity(entityName: string): Promise<EntryRef[]> {
  const result = await invoke<EntryPayload[]>('find_entries_by_entity_name', { entityName })
  return result.map(toEntryRef)
}
