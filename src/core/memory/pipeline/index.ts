import type { Entry } from '../entry'
import { stripHtml } from '../normalization'
import { runPipeline } from './engine'
import { persistenceStage } from './stages'

export async function processEntry(entry: Entry): Promise<void> {
  const text = stripHtml(entry.content)
  if (!text.trim()) return

  const { entities } = runPipeline(text)
  if (entities.length === 0) return

  await persistenceStage(entry.id, entities)
}
