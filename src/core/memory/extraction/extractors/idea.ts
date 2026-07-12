import type { Extractor, EntityInput } from '../../entities/types'
import { normalize, getSentences } from '../../normalization'

const IDEA_SIGNALS = [
  /\bI think\b/i,
  /\bmaybe\b/i,
  /\bwhat if\b/i,
  /\bhow about\b/i,
  /\bimagine\b/i,
  /\bconsider\b/i,
  /\bshould we\b/i,
  /\bcould we\b/i,
  /\bidea\b/i,
  /\bsuggestion\b/i,
  /\bproposal\b/i,
  /\bbrainstorm\b/i,
  /\bconcept\b/i,
  /\bnotion\b/i,
  /\bhypothesis\b/i,
  /\btheory\b/i,
]

const MAX_IDEA_LENGTH = 120

export const ideaExtractor: Extractor = {
  name: 'idea',
  extract(text: string): EntityInput[] {
    const entities: EntityInput[] = []
    const seen = new Set<string>()

    const sentences = getSentences(text)
    for (const sentence of sentences) {
      const hasSignal = IDEA_SIGNALS.some((signal) => signal.test(sentence))
      if (!hasSignal) continue

      const clean = sentence
        .replace(/^["'\s]+|["'\s]+$/g, '')
        .replace(/\s+/g, ' ')

      const truncated =
        clean.length > MAX_IDEA_LENGTH
          ? clean.slice(0, MAX_IDEA_LENGTH).replace(/\s+\S*$/, '') + '...'
          : clean

      const key = normalize(truncated)
      if (!seen.has(key) && key.length > 10) {
        seen.add(key)
        entities.push({
          entityType: 'Idea',
          value: truncated,
          normalizedValue: key,
          confidence: 0.60,
        })
      }
    }

    return entities
  },
}
