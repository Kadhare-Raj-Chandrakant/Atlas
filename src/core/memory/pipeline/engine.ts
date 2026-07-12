import { extractionStage, normalizationStage, resolutionStage } from './stages'
import type { EntityInput } from '../entities/types'

export interface PipelineResult {
  entities: EntityInput[]
}

export function runPipeline(text: string): PipelineResult {
  if (!text.trim()) return { entities: [] }

  const raw = extractionStage(text)
  const normalized = normalizationStage(raw)
  const resolved = resolutionStage(normalized)

  return { entities: resolved }
}
