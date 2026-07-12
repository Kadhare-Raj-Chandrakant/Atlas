import type { EntityInput } from '../../entities/types'

export function resolutionStage(entities: EntityInput[]): EntityInput[] {
  const seen = new Map<string, EntityInput>()

  for (const entity of entities) {
    const key = `${entity.entityType}:${entity.normalizedValue}`
    const existing = seen.get(key)
    if (!existing || entity.confidence > existing.confidence) {
      seen.set(key, entity)
    }
  }

  return Array.from(seen.values())
}
