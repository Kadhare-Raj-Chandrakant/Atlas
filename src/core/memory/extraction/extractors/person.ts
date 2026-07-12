import type { Extractor, EntityInput } from '../../entities/types'
import { normalize, getSentences, isStopWord } from '../../normalization'

const TITLES = /\b(Mr|Ms|Mrs|Dr|Prof|Capt|Coach|Sir|Lady|Lord)\.?\s+/gi

const EXCLUDE_PATTERNS = [
  /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i,
  /^(January|February|March|April|May|June|July|August|September|October|November|December)$/i,
  /^(I|We|You|He|She|It|They|My|Your|His|Her|Our|Their|This|That|These|Those)$/i,
]

const CONTEXT_PATTERNS = [
  /\b(met|saw|called|talked|spoke|emailed|visited|joined|worked|collaborated)\s+with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
  /\b(helped|asked|told|gave|showed|invited|thanked|contacted)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
]

function isLikelyPerson(word: string): boolean {
  if (word.length < 2) return false
  if (word[0] !== word[0].toUpperCase()) return false
  if (/[a-z]/.test(word) && word === word.toUpperCase()) return false
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(word)) return false
  }
  return true
}

export const personExtractor: Extractor = {
  name: 'person',
  extract(text: string): EntityInput[] {
    const entities: EntityInput[] = []
    const seen = new Set<string>()

    const contextMatches = new Set<string>()
    for (const pattern of CONTEXT_PATTERNS) {
      let match: RegExpExecArray | null
      const regex = new RegExp(pattern.source, 'gi')
      while ((match = regex.exec(text)) !== null) {
        const name = match[2].trim()
        if (name) contextMatches.add(name)
      }
    }

    for (const name of contextMatches) {
      const key = normalize(name)
      if (!seen.has(key)) {
        seen.add(key)
        entities.push({
          entityType: 'Person',
          value: name,
          normalizedValue: key,
          confidence: 0.95,
        })
      }
    }

    const titleRegex = new RegExp(TITLES.source, 'gi')
    let titleMatch: RegExpExecArray | null
    while ((titleMatch = titleRegex.exec(text)) !== null) {
      const afterTitle = text.slice(titleMatch.index + titleMatch[0].length).trim()
      const nameMatch = afterTitle.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)
      if (nameMatch) {
        const name = nameMatch[1].trim()
        const key = normalize(name)
        if (!seen.has(key)) {
          seen.add(key)
          entities.push({
            entityType: 'Person',
            value: name,
            normalizedValue: key,
            confidence: 0.90,
          })
        }
      }
    }

    const sentences = getSentences(text)
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/)
      for (let i = 0; i < words.length; i++) {
        const w = words[i]
        if (!isLikelyPerson(w)) continue

        const clean = w.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '')
        if (!clean || clean.length < 2 || isStopWord(clean)) continue
        if (i === 0 && !/[A-Z]/.test(sentence[1] ?? '')) continue

        const key = normalize(clean)
        if (!seen.has(key)) {
          seen.add(key)
          entities.push({
            entityType: 'Person',
            value: clean,
            normalizedValue: key,
            confidence: 0.65,
          })
        }

        if (i + 1 < words.length) {
          const next = words[i + 1].replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '')
          if (next && isLikelyPerson(next) && !isStopWord(next)) {
            const full = `${clean} ${next}`
            const fullKey = normalize(full)
            if (!seen.has(fullKey)) {
              seen.add(fullKey)
              entities.push({
                entityType: 'Person',
                value: full,
                normalizedValue: fullKey,
                confidence: 0.65,
              })
            }
          }
        }
      }
    }

    return entities
  },
}
