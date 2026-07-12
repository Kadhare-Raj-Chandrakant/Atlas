import type { Extractor, EntityInput } from '../../entities/types'
import { normalize, tokenize, isStopWord } from '../../normalization'

const MIN_TOPIC_LENGTH = 4
const MIN_FREQUENCY = 2

export const topicExtractor: Extractor = {
  name: 'topic',
  extract(text: string): EntityInput[] {
    const freq = new Map<string, number>()

    const tokens = tokenize(text)
    for (const token of tokens) {
      if (token.length < MIN_TOPIC_LENGTH) continue
      if (isStopWord(token)) continue
      if (/^\d+$/.test(token)) continue

      freq.set(token, (freq.get(token) || 0) + 1)
    }

    const entities: EntityInput[] = []
    const seen = new Set<string>()

    for (const [word, count] of freq) {
      if (count < MIN_FREQUENCY) continue

      const originalIndex = text.toLowerCase().indexOf(word)
      const originalWord =
        originalIndex >= 0
          ? text.slice(originalIndex, originalIndex + word.length)
          : word

      const display =
        originalWord.charAt(0).toUpperCase() + originalWord.slice(1)
      const key = normalize(word)

      if (!seen.has(key)) {
        seen.add(key)
        entities.push({
          entityType: 'Topic',
          value: display,
          normalizedValue: key,
          confidence: 0.50,
        })
      }
    }

    return entities
  },
}
