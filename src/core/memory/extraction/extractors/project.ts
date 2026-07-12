import type { Extractor, EntityInput } from '../../entities/types'
import { normalize, getSentences } from '../../normalization'

const PROJECT_CONTEXT = /\b(working on|building|developing|launching|shipping|releasing|designing|creating|starting|planning|prototyping)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/gi

const PROJECT_MARKERS = /\b(project|initiative|program|system|platform|app|tool|framework|engine|service|product|feature|module|component|dashboard|pipeline|workflow)\b/i

export const projectExtractor: Extractor = {
  name: 'project',
  extract(text: string): EntityInput[] {
    const entities: EntityInput[] = []
    const seen = new Set<string>()

    let match: RegExpExecArray | null
    const regex = new RegExp(PROJECT_CONTEXT.source, 'gi')
    while ((match = regex.exec(text)) !== null) {
      const name = match[2].trim()
      if (name.length >= 2) {
        const key = normalize(name)
        if (!seen.has(key)) {
          seen.add(key)
          entities.push({
            entityType: 'Project',
            value: name,
            normalizedValue: key,
            confidence: 0.90,
          })
        }
      }
    }

    const sentences = getSentences(text)
    for (const sentence of sentences) {
      const markerMatch = PROJECT_MARKERS.exec(sentence)
      if (!markerMatch) continue

      const before = sentence.slice(0, markerMatch.index).trim()
      const beforeWords = before.split(/\s+/)
      const candidate = beforeWords[beforeWords.length - 1]

      if (
        candidate &&
        candidate[0] === candidate[0].toUpperCase() &&
        candidate.length >= 2
      ) {
        const key = normalize(candidate)
        if (!seen.has(key)) {
          seen.add(key)
          entities.push({
            entityType: 'Project',
            value: candidate,
            normalizedValue: key,
            confidence: 0.75,
          })
        }
      }

      const after = sentence.slice(markerMatch.index + markerMatch[0].length).trim()
      const afterMatch = after.match(/^([A-Z][a-zA-Z0-9]+)/)
      if (afterMatch) {
        const key = normalize(afterMatch[1])
        if (!seen.has(key)) {
          seen.add(key)
          entities.push({
            entityType: 'Project',
            value: afterMatch[1],
            normalizedValue: key,
            confidence: 0.75,
          })
        }
      }
    }

    return entities
  },
}
