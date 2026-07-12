import { invoke } from '@tauri-apps/api/core'
import type { EntityInput } from '../../entities/types'

export async function persistenceStage(
  entryId: string,
  entities: EntityInput[],
): Promise<void> {
  if (entities.length === 0) return
  await invoke('save_entities', { entryId, entities })
}
