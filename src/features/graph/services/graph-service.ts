import { invoke } from '@tauri-apps/api/core'
import type { RelatedEntitiesResponse } from '../types'

export async function getRelatedEntities(
  entityId: string,
): Promise<RelatedEntitiesResponse | null> {
  return invoke<RelatedEntitiesResponse | null>('get_related_entities', {
    entityId,
  })
}
