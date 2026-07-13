import type { Entry } from '../entry'
import { stripHtml } from '../normalization'
import { runPipeline } from './engine'
import { persistenceStage } from './stages'

export async function processEntry(entry: Entry): Promise<void> {
  const text = stripHtml(entry.content)
  if (!text.trim()) return

  const { entities } = runPipeline(text)

  // Always ensure the note's Date itself is extracted as a central dot (`Date`)
  const dateEntity = {
    entityType: 'Date' as const,
    value: entry.date,
    normalizedValue: entry.date,
    confidence: 1.0,
  }

  const allEntities = [dateEntity, ...entities]
  await persistenceStage(entry.id, allEntities)
}
