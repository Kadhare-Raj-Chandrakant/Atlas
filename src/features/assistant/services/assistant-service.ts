import type { Message } from '../types'
import { detectIntent } from './intent-service'
import { getResponse, getWritingPrompts } from './responses'
import {
  findEntryByDate,
  findEntriesBetweenDates,
  findRecentEntries,
  findEntriesByEntity,
} from './retrieval-service'

interface ResponseOutput {
  text: string
  citations: import('../types').Citation[]
}

let messageIdCounter = 0

function nextId(): string {
  messageIdCounter++
  return `msg-${Date.now()}-${messageIdCounter}`
}

function createUserMessage(text: string): Message {
  return {
    id: nextId(),
    role: 'user',
    content: text,
    timestamp: new Date().toISOString(),
  }
}

function createAssistantMessage(response: ResponseOutput): Message {
  return {
    id: nextId(),
    role: 'assistant',
    content: response.text,
    timestamp: new Date().toISOString(),
    citations: response.citations,
  }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function handleMemoryRecall(queryType: NonNullable<ReturnType<typeof detectIntent>['queryType']>): Promise<ResponseOutput> {
  try {
    switch (queryType.type) {
      case 'date': {
        const entry = await findEntryByDate(queryType.date)
        if (entry) {
          const preview = entry.contentText.slice(0, 200)
          return {
            text: `On ${formatDate(queryType.date)} you wrote:\n\n${preview}`,
            citations: [{ date: entry.date, preview: entry.contentText.slice(0, 100) }],
          }
        }
        return { text: `I couldn\u2019t find any entries for ${formatDate(queryType.date)}.`, citations: [] }
      }
      case 'date-range': {
        const entries = await findEntriesBetweenDates(queryType.from, queryType.to)
        if (entries.length === 0) {
          return {
            text: `I couldn\u2019t find any entries between ${shortDate(queryType.from)} and ${shortDate(queryType.to)}.`,
            citations: [],
          }
        }
        const citations = entries.map((e) => ({ date: e.date, preview: e.contentText.slice(0, 100) }))
        const summaries = entries.slice(0, 8).map((e) => `\u2022 ${shortDate(e.date)} \u2014 ${e.contentText.slice(0, 100)}`)
        const extra = entries.length > 8 ? `\n\n...and ${entries.length - 8} more.` : ''
        return {
          text: `Between ${shortDate(queryType.from)} and ${shortDate(queryType.to)} there ${entries.length === 1 ? 'is' : 'are'} ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}:\n\n${summaries.join('\n')}${extra}`,
          citations,
        }
      }
      case 'recent': {
        const entries = await findRecentEntries(queryType.days)
        if (entries.length === 0) {
          return { text: `No entries from the last ${queryType.days} day${queryType.days === 1 ? '' : 's'}.`, citations: [] }
        }
        const citations = entries.map((e) => ({ date: e.date, preview: e.contentText.slice(0, 100) }))
        return {
          text: `Here ${entries.length === 1 ? 'is' : 'are'} your ${entries.length} most recent entr${entries.length === 1 ? 'y' : 'ies'}:\n\n${entries.slice(0, 10).map((e) => `\u2022 ${shortDate(e.date)} \u2014 ${e.contentText.slice(0, 120)}`).join('\n\n')}`,
          citations,
        }
      }
      case 'keyword': {
        const { searchAll } = await import('./search-keyword')
        const entries = await searchAll(queryType.keyword)
        if (entries.length === 0) {
          return { text: `I couldn\u2019t find any entries matching "${queryType.keyword}".`, citations: [] }
        }
        const citations = entries.map((e) => ({ date: e.date, preview: e.contentText.slice(0, 100) }))
        return {
          text: `Found ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} matching "${queryType.keyword}":\n\n${entries.slice(0, 10).map((e) => `\u2022 ${shortDate(e.date)} \u2014 ${e.contentText.slice(0, 120)}`).join('\n\n')}`,
          citations,
        }
      }
      default:
        return { text: getResponse('Unknown'), citations: [] }
    }
  } catch {
    return {
      text: 'Sorry, I encountered an error while searching your memories. Please try again.',
      citations: [],
    }
  }
}

async function handleEntitySearch(queryType: NonNullable<ReturnType<typeof detectIntent>['queryType']>): Promise<ResponseOutput> {
  if (queryType.type !== 'entity') {
    return { text: 'I\u2019m not sure which entity you\u2019re asking about.', citations: [] }
  }
  try {
    const entries = await findEntriesByEntity(queryType.entityName)
    if (entries.length === 0) {
      return { text: `I couldn\u2019t find anything about "${queryType.entityName}".`, citations: [] }
    }
    const citations = entries.map((e) => ({ date: e.date, preview: e.contentText.slice(0, 100) }))
    const count = entries.length
    const summaries = entries.slice(0, 5).map((e) => `\u2022 ${shortDate(e.date)} \u2014 ${e.contentText.slice(0, 120)}`)
    const extra = count > 5 ? `\n\n...and ${count - 5} more entr${count - 5 === 1 ? 'y' : 'ies'}.` : ''
    return {
      text: `I found ${count} entr${count === 1 ? 'y' : 'ies'} mentioning "${queryType.entityName}":\n\n${summaries.join('\n\n')}${extra}`,
      citations,
    }
  } catch {
    return {
      text: 'Sorry, I encountered an error while searching your memories. Please try again.',
      citations: [],
    }
  }
}

async function handleReflection(keyword?: string): Promise<ResponseOutput> {
  if (!keyword) {
    return { text: getResponse('Reflection'), citations: [] }
  }
  try {
    const { searchAll } = await import('./search-keyword')
    const entries = await searchAll(keyword)
    if (entries.length === 0) {
      return { text: getResponse('Reflection'), citations: [] }
    }
    const citations = entries.map((e) => ({ date: e.date, preview: e.contentText.slice(0, 100) }))
    const count = entries.length
    const dateList = entries.slice(0, 10).map((e) => `\u2022 ${shortDate(e.date)}`).join('\n')
    return {
      text: `You mentioned "${keyword}" in ${count} entr${count === 1 ? 'y' : 'ies'}:\n\n${dateList}\n\n${count > 10 ? `...and ${count - 10} more.` : ''}`,
      citations,
    }
  } catch {
    return { text: getResponse('Reflection'), citations: [] }
  }
}

export async function processQuery(text: string): Promise<{ userMessage: Message; assistantMessage: Message }> {
  const userMessage = createUserMessage(text)
  const { intent, reflectionKeyword, queryType } = detectIntent(text)
  let response: ResponseOutput

  try {
    switch (intent) {
      case 'Greeting':
      case 'SmallTalk':
      case 'Gratitude':
      case 'Farewell':
        response = { text: getResponse(intent), citations: [] }
        break

      case 'WritingHelp':
        response = {
          text: getWritingPrompts(3).map((p, i) => `${i + 1}. ${p}`).join('\n\n'),
          citations: [],
        }
        break

      case 'Reflection':
        response = await handleReflection(reflectionKeyword)
        break

      case 'MemoryRecall':
        if (queryType) {
          response = await handleMemoryRecall(queryType)
        } else {
          response = { text: getResponse('Unknown'), citations: [] }
        }
        break

      case 'EntitySearch':
        if (queryType) {
          response = await handleEntitySearch(queryType)
        } else {
          response = { text: getResponse('Unknown'), citations: [] }
        }
        break

      case 'Unknown':
      default:
        response = { text: getResponse('Unknown'), citations: [] }
        break
    }
  } catch {
    response = {
      text: 'Sorry, I encountered an error while searching your memories. Please try again.',
      citations: [],
    }
  }

  return { userMessage, assistantMessage: createAssistantMessage(response) }
}
