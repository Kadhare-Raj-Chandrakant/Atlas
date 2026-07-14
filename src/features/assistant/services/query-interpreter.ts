import type { QueryType } from '../types'

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseRelativeDate(text: string): string | null {
  const lower = text.toLowerCase().trim()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (lower === 'today') return formatDate(today)

  if (lower === 'yesterday') {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return formatDate(d)
  }

  if (lower === 'tomorrow') {
    const d = new Date(today)
    d.setDate(d.getDate() + 1)
    return formatDate(d)
  }

  const dayNames: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  }

  const lastMatch = lower.match(/last\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i)
  if (lastMatch) {
    const targetDay = dayNames[lastMatch[1].toLowerCase()]
    const currentDay = today.getDay()
    let diff = currentDay - targetDay
    if (diff <= 0) diff += 7
    const d = new Date(today)
    d.setDate(d.getDate() - diff)
    return formatDate(d)
  }

  return null
}

function parseExplicitDate(text: string): string | null {
  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/(\d{4})-(\d{1,2})-(\d{1,2})/, (m) => `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`],
    [/(\d{1,2})\/(\d{1,2})\/(\d{4})/, (m) => `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`],
    [/(\d{1,2})\/(\d{1,2})\/(\d{2})/, (m) => `20${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`],
    [/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i, (m) => {
      const months: Record<string, number> = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      }
      const mon = months[m[0].split(/\s/)[0].toLowerCase()]
      if (!mon) return ''
      return `${m[2]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }],
    [/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/i, (m) => {
      const months: Record<string, number> = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
      }
      const mon = months[m[0].split(/\s/)[0].toLowerCase()]
      if (!mon) return ''
      return `${m[2]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }],
    [/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?/i, (m) => {
      const months: Record<string, number> = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      }
      const fullMatch = m[0]
      const monName = fullMatch.split(/\s/)[0].toLowerCase()
      const mon = months[monName]
      if (!mon) return ''
      const now = new Date()
      const year = now.getFullYear()
      return `${year}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }],
    [/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?/i, (m) => {
      const months: Record<string, number> = {
        jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
        jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
      }
      const mon = months[m[0].split(/\s/)[0].toLowerCase()]
      if (!mon) return ''
      const now = new Date()
      const year = now.getFullYear()
      return `${year}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`
    }],
  ]

  for (const [re, fmt] of patterns) {
    const m = text.match(re)
    if (m) {
      const result = fmt(m)
      if (result) return result
    }
  }

  return null
}

function parseDateRange(text: string): { from: string; to: string } | null {
  const lower = text.toLowerCase()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = formatDate(today)

  if (/\bthis\s+month\b/.test(lower)) {
    const from = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`
    return { from, to: todayStr }
  }

  if (/\blast\s+month\b/.test(lower)) {
    const d = new Date(today)
    d.setMonth(d.getMonth() - 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { from, to }
  }

  if (/\bthis\s+week\b/.test(lower)) {
    const day = today.getDay()
    const mon = new Date(today)
    mon.setDate(mon.getDate() - ((day + 6) % 7))
    return { from: formatDate(mon), to: todayStr }
  }

  if (/\blast\s+week\b/.test(lower)) {
    const day = today.getDay()
    const mon = new Date(today)
    mon.setDate(mon.getDate() - ((day + 6) % 7) - 7)
    const sun = new Date(mon)
    sun.setDate(sun.getDate() + 6)
    return { from: formatDate(mon), to: formatDate(sun) }
  }

  const monthNames = '(?:january|february|march|april|may|june|july|august|september|october|november|december)'
  const monthMatch = text.match(new RegExp(`in\\s+${monthNames}\\s+(\\d{4})`, 'i'))
  if (monthMatch) {
    const months: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    }
    const mon = months[monthMatch[1].toLowerCase()]
    if (mon) {
      const year = parseInt(monthMatch[2], 10)
      const from = `${year}-${String(mon).padStart(2, '0')}-01`
      const lastDay = new Date(year, mon, 0).getDate()
      const to = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      return { from, to }
    }
  }

  return null
}

export function interpretQuery(text: string): QueryType {
  const trimmed = text.trim()
  if (!trimmed) return { type: 'unknown', original: text }

  const relativeDate = parseRelativeDate(trimmed)
  if (relativeDate) return { type: 'date', date: relativeDate }

  const dateRange = parseDateRange(trimmed)
  if (dateRange) return { type: 'date-range', from: dateRange.from, to: dateRange.to }

  const explicitDate = parseExplicitDate(trimmed)
  if (explicitDate) return { type: 'date', date: explicitDate }

  const recentMatch = trimmed.match(/\b(recent|latest|last\s+\d+\s+days?)\b/i)
  if (recentMatch) {
    const daysMatch = trimmed.match(/last\s+(\d+)\s+days?/i)
    const days = daysMatch ? parseInt(daysMatch[1], 10) : 7
    return { type: 'recent', days }
  }

  const entityPrefixes = [
    /show\s+(?:every\s+time\s+)?(?:I\s+)?(?:worked\s+on|talked\s+(?:to|about)|met|visited|discussed|wrote\s+about)\s+(.+)/i,
    /(?:what\s+do\s+I\s+know\s+about|tell\s+me\s+about|show\s+me\s+(?:everything\s+)?about)\s+(.+)/i,
    /(?:when\s+did\s+I\s+(?:first\s+)?(?:meet|talk\s+to|visit|work\s+on))\s+(.+)/i,
    /find\s+(?:entries?\s+)?(?:about|with|for|mentioning)\s+(.+)/i,
    /what\s+(?:projects|people|places|ideas|topics)\s+(?:did\s+I\s+)?(?:discuss|mention|work\s+on)\s+(?:in|during|for)\s+(.+)/i,
  ]

  for (const re of entityPrefixes) {
    const m = trimmed.match(re)
    if (m) {
      const entityName = m[1].trim()
      if (entityName && entityName.length > 0) {
        return { type: 'entity', entityName }
      }
    }
  }

  const keywordMatch = trimmed.match(/find\s+(?:entries\s+)?(?:matching|containing|with)\s+(.+)/i)
  if (keywordMatch) {
    const kw = keywordMatch[1].trim()
    if (kw) return { type: 'keyword', keyword: kw }
  }

  return { type: 'unknown', original: text }
}
