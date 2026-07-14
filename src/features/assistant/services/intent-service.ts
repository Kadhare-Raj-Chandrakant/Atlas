import type { IntentType, QueryType } from '../types'
import { interpretQuery } from './query-interpreter'

const greetingPatterns = [
  /^(hello|hi|hey|good\s*(morning|afternoon|evening))(|\s|!|\.)*$/i,
  /^hey\s+atlas/i,
  /^hi\s+atlas/i,
]

const smallTalkPatterns = [
  /how\s+(are|'re)\s+(you|things)/i,
  /how('s| is)\s+(your\s+)?day/i,
  /what('s| is)\s+up/i,
  /how\s+are\s+things/i,
  /how('s| is)\s+it\s+going/i,
]

const gratitudePatterns = [
  /^thanks?(\s+you)?(|\s|!|\.)*$/i,
  /^thank\s+you(|\s|!|\.)*$/i,
  /^appreciate\s+it/i,
  /^much\s+appreciated/i,
]

const farewellPatterns = [
  /^(bye|goodbye|good\s*night|see\s+you|see\s+ya)(|\s|!|\.)*$/i,
  /^(take\s+care)/i,
  /^(later|cya)/i,
]

const writingHelpPatterns = [
  /(help\s+me\s+)?(write|what\s+to\s+write)/i,
  /(don't|dont|do\s+not)\s+know\s+what\s+to\s+write/i,
  /(give|need|have)\s+(me\s+)?(some\s+)?(prompts?|ideas?|topics?)/i,
  /what\s+(should|can)\s+I\s+write/i,
  /writer'?s?\s+block/i,
  /i\s+have\s+nothing\s+to\s+say/i,
]

const reflectionPatterns = [
  /how\s+(have|'ve)\s+I\s+been\s+(lately|recently|doing)/i,
  /what\s+(have|'ve)\s+I\s+been\s+(focusing|working)\s+on/i,
  /what\s+(have|'ve)\s+I\s+been\s+up\s+to/i,
  /have\s+I\s+(written|talked|thought)\s+about\s+(.+?)\s+(recently|lately)/i,
  /what\s+(have|'ve)\s+I\s+been\s+(thinking|writing)\s+about/i,
  /(what|how)\s+(have|'ve)\s+things?\s+been/i,
]

export interface IntentResult {
  intent: IntentType
  reflectionKeyword?: string
  queryType?: QueryType
}

export function detectIntent(text: string): IntentResult {
  const trimmed = text.trim()
  if (!trimmed) return { intent: 'Unknown' }

  for (const re of greetingPatterns) {
    if (re.test(trimmed)) return { intent: 'Greeting' }
  }

  for (const re of smallTalkPatterns) {
    if (re.test(trimmed)) return { intent: 'SmallTalk' }
  }

  for (const re of gratitudePatterns) {
    if (re.test(trimmed)) return { intent: 'Gratitude' }
  }

  for (const re of farewellPatterns) {
    if (re.test(trimmed)) return { intent: 'Farewell' }
  }

  for (const re of writingHelpPatterns) {
    if (re.test(trimmed)) return { intent: 'WritingHelp' }
  }

  const reflectionMatch = trimmed.match(/have\s+I\s+(written|talked|thought)\s+about\s+(.+?)\s*(recently|lately)?/i)
  if (reflectionMatch) {
    const keyword = reflectionMatch[2].trim()
    if (keyword) {
      return { intent: 'Reflection', reflectionKeyword: keyword }
    }
  }

  for (const re of reflectionPatterns) {
    if (re.test(trimmed)) return { intent: 'Reflection' }
  }

  const query = interpretQuery(trimmed)

  if (query.type === 'date' || query.type === 'date-range' || query.type === 'recent') {
    return { intent: 'MemoryRecall', queryType: query }
  }

  if (query.type === 'entity') {
    return { intent: 'EntitySearch', queryType: query }
  }

  if (query.type === 'keyword') {
    return { intent: 'MemoryRecall', queryType: query }
  }

  return { intent: 'Unknown' }
}
