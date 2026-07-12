import { invoke } from '@tauri-apps/api/core'
import type { EntitySummary, EntityDetail } from './types'

export async function getEntities(query?: string): Promise<EntitySummary[]> {
  return invoke<EntitySummary[]>('get_entities', { query: query || null })
}

export async function getEntityDetail(
  entityId: string,
): Promise<EntityDetail | null> {
  return invoke<EntityDetail | null>('get_entity_detail', { entityId })
}
