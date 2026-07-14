import type { Citation, IntentType, QueryType } from '../types'
import {
  findEntryByDate,
  findEntriesBetweenDates,
  findRecentEntries,
  findEntriesByEntity,
} from './retrieval-service'
import { searchAll } from './search-keyword'

export interface RetrievedEntry {
  date: string
  content: string
}

export interface MemoryRetrievalResult {
  entries: RetrievedEntry[]
  citations: Citation[]
  context: string
}

async function retrieveForIntent(params: {
  intent: IntentType
  reflectionKeyword?: string
  queryType?: QueryType
}): Promise<RetrievedEntry[]> {
  const { intent, reflectionKeyword, queryType } = params

  if (intent === 'MemoryRecall' && queryType) {
    switch (queryType.type) {
      case 'date': {
        const entry = await findEntryByDate(queryType.date)
        return entry ? [{ date: entry.date, content: entry.contentText }] : []
      }
      case 'date-range': {
        const list = await findEntriesBetweenDates(queryType.from, queryType.to)
        return list.map((e) => ({ date: e.date, content: e.contentText }))
      }
      case 'recent': {
        const list = await findRecentEntries(queryType.days)
        return list.map((e) => ({ date: e.date, content: e.contentText }))
      }
      case 'keyword': {
        const list = await searchAll(queryType.keyword)
        return list.map((e) => ({ date: e.date, content: e.contentText }))
      }
      default:
        return []
    }
  }

  if (intent === 'EntitySearch' && queryType?.type === 'entity') {
    const list = await findEntriesByEntity(queryType.entityName)
    return list.map((e) => ({ date: e.date, content: e.contentText }))
  }

  if (intent === 'Reflection' && reflectionKeyword) {
    const list = await searchAll(reflectionKeyword)
    return list.map((e) => ({ date: e.date, content: e.contentText }))
  }

  return []
}

export async function retrieveMemory(params: {
  intent: IntentType
  reflectionKeyword?: string
  queryType?: QueryType
}): Promise<MemoryRetrievalResult> {
  const entries = await retrieveForIntent(params)

  const citations: Citation[] = entries.map((e) => ({
    date: e.date,
    preview: e.content.slice(0, 100),
  }))

  const context = entries.length
    ? entries
        .slice(0, 10)
        .map((e) => `Date: ${e.date}\n${e.content}`)
        .join('\n\n')
    : ''

  return { entries, citations, context }
}
