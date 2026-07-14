import type { EntryRef } from './retrieval-service'
import type { Citation } from '../types'

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

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}

function truncatePreview(text: string, maxLen = 200): string {
  const cleaned = stripHtml(text).replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLen) return cleaned
  return cleaned.slice(0, maxLen).replace(/\s+\S*$/, '') + '...'
}

export interface FormattedResponse {
  text: string
  citations: Citation[]
}

export function formatDateResponse(entries: EntryRef[], dateStr: string): FormattedResponse {
  if (entries.length === 0) {
    return {
      text: `I couldn't find any entries for ${formatDate(dateStr)}.`,
      citations: [],
    }
  }

  const entry = entries[0]
  const preview = truncatePreview(entry.contentText)

  return {
    text: `On ${formatDate(dateStr)} you wrote:\n\n${preview}`,
    citations: [{ date: entry.date, preview: truncatePreview(entry.contentText, 100) }],
  }
}

export function formatEntityResponse(entries: EntryRef[], entityName: string): FormattedResponse {
  if (entries.length === 0) {
    return {
      text: `I couldn't find any entries mentioning "${entityName}".`,
      citations: [],
    }
  }

  const count = entries.length
  const citations: Citation[] = entries.map((e) => ({
    date: e.date,
    preview: truncatePreview(e.contentText, 100),
  }))

  const intro = `I found ${count} entr${count === 1 ? 'y' : 'ies'} mentioning "${entityName}":\n\n`

  if (count === 1) {
    return {
      text: intro + truncatePreview(entries[0].contentText),
      citations,
    }
  }

  const summaries = entries.slice(0, 5).map((e) => {
    const preview = truncatePreview(e.contentText, 120)
    return `• ${shortDate(e.date)} — ${preview}`
  })

  const extra = count > 5 ? `\n\n...and ${count - 5} more entr${count - 5 === 1 ? 'y' : 'ies'}.` : ''

  return {
    text: intro + summaries.join('\n\n') + extra,
    citations,
  }
}

export function formatDateRangeResponse(entries: EntryRef[], from: string, to: string): FormattedResponse {
  if (entries.length === 0) {
    return {
      text: `I couldn't find any entries between ${shortDate(from)} and ${shortDate(to)}.`,
      citations: [],
    }
  }

  const citations: Citation[] = entries.map((e) => ({
    date: e.date,
    preview: truncatePreview(e.contentText, 100),
  }))

  const summaries = entries.slice(0, 8).map((e) => {
    const preview = truncatePreview(e.contentText, 100)
    return `• ${shortDate(e.date)} — ${preview}`
  })

  const extra = entries.length > 8 ? `\n\n...and ${entries.length - 8} more entr${entries.length - 8 === 1 ? 'y' : 'ies'}.` : ''

  return {
    text: `Between ${shortDate(from)} and ${shortDate(to)} there ${entries.length === 1 ? 'is' : 'are'} ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}:\n\n` + summaries.join('\n') + extra,
    citations,
  }
}

export function formatRecentResponse(entries: EntryRef[], days: number): FormattedResponse {
  if (entries.length === 0) {
    return {
      text: `No entries from the last ${days} day${days === 1 ? '' : 's'}.`,
      citations: [],
    }
  }

  const citations: Citation[] = entries.map((e) => ({
    date: e.date,
    preview: truncatePreview(e.contentText, 100),
  }))

  return {
    text: `Here ${entries.length === 1 ? 'is' : 'are'} your ${entries.length} most recent entr${entries.length === 1 ? 'y' : 'ies'}:\n\n` +
      entries.slice(0, 10).map((e) => {
        const preview = truncatePreview(e.contentText, 120)
        return `• ${shortDate(e.date)} — ${preview}`
      }).join('\n\n'),
    citations,
  }
}

export function formatKeywordResponse(entries: EntryRef[], keyword: string): FormattedResponse {
  if (entries.length === 0) {
    return {
      text: `I couldn't find any entries matching "${keyword}".`,
      citations: [],
    }
  }

  const citations: Citation[] = entries.map((e) => ({
    date: e.date,
    preview: truncatePreview(e.contentText, 100),
  }))

  return {
    text: `Found ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} matching "${keyword}":\n\n` +
      entries.slice(0, 10).map((e) => {
        const preview = truncatePreview(e.contentText, 120)
        return `• ${shortDate(e.date)} — ${preview}`
      }).join('\n\n'),
    citations,
  }
}

export function formatUnknownQuery(text: string): FormattedResponse {
  return {
    text: `I'm not sure how to answer "${text}". Try asking about a specific date, person, project, or place — for example:\n\n• "What happened on June 20?"\n• "Show me everything about Rahul"\n• "What happened this month?"\n• "Show recent entries"`,
    citations: [],
  }
}
