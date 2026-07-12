import type { Extractor, EntityInput } from '../../entities/types'
import { normalize } from '../../normalization'

const DATE_PATTERNS = [
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
  /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?\b/gi,
  /\b\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\b/gi,
]

const RELATIVE_DAYS: Record<string, string> = {
  today: 'today',
  tomorrow: 'tomorrow',
  yesterday: 'yesterday',
}

const DAY_NAMES = /(next|last|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi

export const dateExtractor: Extractor = {
  name: 'date',
  extract(text: string): EntityInput[] {
    const entities: EntityInput[] = []
    const seen = new Set<string>()

    for (const pattern of DATE_PATTERNS) {
      let match: RegExpExecArray | null
      const regex = new RegExp(pattern.source, 'g')
      while ((match = regex.exec(text)) !== null) {
        const value = match[0].trim()
        const key = normalize(value)
        if (!seen.has(key)) {
          seen.add(key)
          entities.push({
            entityType: 'Date',
            value,
            normalizedValue: key,
            confidence: 0.98,
          })
        }
      }
    }

    const lower = text.toLowerCase()
    for (const [word, iso] of Object.entries(RELATIVE_DAYS)) {
      const regex = new RegExp(`\\b${word}\\b`, 'i')
      if (regex.test(lower) && !seen.has(word)) {
        seen.add(word)
        entities.push({
          entityType: 'Date',
          value: word.charAt(0).toUpperCase() + word.slice(1),
          normalizedValue: iso,
          confidence: 0.90,
        })
      }
    }

    const dayMatch = DAY_NAMES.exec(text)
    if (dayMatch) {
      const value = dayMatch[0].trim()
      const key = normalize(value)
      if (!seen.has(key)) {
        seen.add(key)
        entities.push({
          entityType: 'Date',
          value,
          normalizedValue: key,
          confidence: 0.80,
        })
      }
    }

    return entities
  },
}
