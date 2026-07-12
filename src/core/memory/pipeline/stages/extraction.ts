import type { EntityInput } from '../../entities/types'
import { extractors } from '../../extraction/extractors'

export function extractionStage(text: string): EntityInput[] {
  const results: EntityInput[] = []

  for (const extractor of extractors) {
    try {
      results.push(...extractor.extract(text))
    } catch {
      // Silently skip failed extractors
    }
  }

  return results
}
