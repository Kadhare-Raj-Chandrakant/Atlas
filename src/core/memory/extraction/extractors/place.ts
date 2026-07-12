import type { Extractor, EntityInput } from '../../entities/types'
import { normalize, getSentences } from '../../normalization'

const LOCATION_PREPOSITIONS = /\b(at|in|to|from|near|by|around|visited|went\s+to|headed\s+to|moved\s+to)\s+/gi

const PLACE_SUFFIXES = /\b(cafe|café|restaurant|office|park|building|hotel|store|shop|bar|pub|library|museum|gym|school|hospital|bank|airport|station|square|street|avenue|road|drive|lane|blvd|boulevard|plaza|center|centre|club|house|studio|lab|laboratory|factory|warehouse|theater|theatre|cinema|gallery|stadium|arena|field|court|pool|spa|resort|lodge|inn|tavern|grill|kitchen|bakery|deli|market|mall|cinema|chapel|church|temple|mosque|synagogue)\b/i

const KNOWN_PLACES = new Set([
  'starbucks', 'walmart', 'target', 'costco', 'ikea', 'mcdonalds',
  'whole foods', 'trader joes', 'home depot', 'lowes', 'best buy',
  'amazon', 'google', 'apple', 'microsoft', 'meta', 'netflix',
  'central park', 'times square', 'grand central',
])

export const placeExtractor: Extractor = {
  name: 'place',
  extract(text: string): EntityInput[] {
    const entities: EntityInput[] = []
    const seen = new Set<string>()

    for (const known of KNOWN_PLACES) {
      const regex = new RegExp(`\\b${known}\\b`, 'gi')
      if (regex.test(text)) {
        const key = normalize(known)
        if (!seen.has(key)) {
          seen.add(key)
          entities.push({
            entityType: 'Place',
            value: known
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
            normalizedValue: key,
            confidence: 0.95,
          })
        }
      }
    }

    const sentences = getSentences(text)
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase()
      const prepMatch = LOCATION_PREPOSITIONS.exec(lower)
      if (!prepMatch) continue

      const afterPrep = sentence.slice(prepMatch.index + prepMatch[0].length).trim()
      const words = afterPrep.split(/\s+/)

      const placeWords: string[] = []
      for (const word of words) {
        const clean = word.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '')
        if (!clean) continue
        if (clean[0] === clean[0].toUpperCase() || PLACE_SUFFIXES.test(clean)) {
          placeWords.push(clean)
        } else if (placeWords.length > 0) {
          break
        } else {
          break
        }
      }

      if (placeWords.length > 0) {
        const value = placeWords.join(' ')
        const key = normalize(value)
        if (!seen.has(key)) {
          seen.add(key)
          entities.push({
            entityType: 'Place',
            value,
            normalizedValue: key,
            confidence: 0.85,
          })
        }
      }
    }

    return entities
  },
}
