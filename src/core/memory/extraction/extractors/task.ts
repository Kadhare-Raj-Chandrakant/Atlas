import type { Extractor, EntityInput } from '../../entities/types'
import { normalize } from '../../normalization'

const TASK_PATTERNS = [
  /[-*]\s*\[ \].*/g,
  /[-*]\s*\[x\].*/gi,
  /\bTODO:\s*(.*(?:\n(?!\s*[-*]\s*\[).*)?)/gi,
  /\bTASK:\s*(.*(?:\n(?!\s*[-*]\s*\[).*)?)/gi,
]

const ACTION_PHRASES = [
  /\b(need to|have to|must|should|remember to|don't forget to|got to|gotta|supposed to|plan to|going to)\s+(.+?)(?:[.!?]|$)/gi,
]

export const taskExtractor: Extractor = {
  name: 'task',
  extract(text: string): EntityInput[] {
    const entities: EntityInput[] = []
    const seen = new Set<string>()

    for (const pattern of TASK_PATTERNS) {
      let match: RegExpExecArray | null
      const regex = new RegExp(pattern.source, 'g')
      while ((match = regex.exec(text)) !== null) {
        const full = match[0].trim()
        const cleaned = full
          .replace(/^[-*]\s*\[[ x]\]\s*/i, '')
          .replace(/^(TODO|TASK):\s*/i, '')
          .trim()

        if (cleaned && cleaned.length > 3) {
          const key = normalize(cleaned)
          if (!seen.has(key)) {
            seen.add(key)
            entities.push({
              entityType: 'Task',
              value: cleaned,
              normalizedValue: key,
              confidence: 0.95,
            })
          }
        }
      }
    }

    for (const pattern of ACTION_PHRASES) {
      let match: RegExpExecArray | null
      const regex = new RegExp(pattern.source, 'gi')
      while ((match = regex.exec(text)) !== null) {
        const action = match[2].trim()
        if (action && action.length > 3) {
          const key = normalize(action)
          if (!seen.has(key)) {
            seen.add(key)
            entities.push({
              entityType: 'Task',
              value: action.charAt(0).toUpperCase() + action.slice(1),
              normalizedValue: key,
              confidence: 0.80,
            })
          }
        }
      }
    }

    return entities
  },
}
