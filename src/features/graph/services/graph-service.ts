import { invoke } from '@tauri-apps/api/core'
import type { RelatedEntitiesResponse, GlobalGraphResponse } from '../types'

export async function getRelatedEntities(
  entityId: string,
): Promise<RelatedEntitiesResponse | null> {
  return invoke<RelatedEntitiesResponse | null>('get_related_entities', {
    entityId,
  })
}

export async function getGlobalGraph(): Promise<GlobalGraphResponse> {
  return invoke<GlobalGraphResponse>('get_global_graph')
}
