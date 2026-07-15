import type { IntentResult } from './intent-service'
import { detectIntent } from './intent-service'

export type RouteMode = 'conversation' | 'knowledge' | 'memory' | 'hybrid'

export interface RouteResult {
  mode: RouteMode
  intent: IntentResult['intent']
  reflectionKeyword?: string
  queryType?: IntentResult['queryType']
}

const conversationIntents = new Set([
  'Greeting',
  'SmallTalk',
  'Gratitude',
  'Farewell',
  'WritingHelp',
])

const memoryIntents = new Set(['MemoryRecall', 'EntitySearch', 'Reflection'])

const knowledgePatterns = [
  /\bwhat\s+is\b/i,
  /\bwhat\s+are\b/i,
  /\bwhat\u2019s\b/i,
  /\bwhat's\b/i,
  /\bwho\s+is\b/i,
  /\bwho\s+are\b/i,
  /\bexplain\b/i,
  /\bdefine\b/i,
  /\bdefinition\s+of\b/i,
  /\bhow\s+does\b/i,
  /\bhow\s+do\b/i,
  /\bhow\s+to\b/i,
  /\btell\s+me\s+about\b/i,
  /\bdo\s+you\s+know\s+about\b/i,
  /\bwhat\s+does\b/i,
]

const memoryPatterns = [
  /\bwhat\s+happened\b/i,
  /\bwhen\s+did\b/i,
  /\bshow\s+my\b/i,
  /\bshow\s+me\s+my\b/i,
  /\bshow\s+everything\s+about\b/i,
  /\bfind\b/i,
  /\bsearch\b/i,
  /\bremember\b/i,
  /\bjournal\b/i,
  /\bdiary\b/i,
  /\bwhat\s+did\s+i\b/i,
  /\bhave\s+i\b/i,
  /\bdid\s+i\b/i,
  /\bwas\s+i\b/i,
  /\byesterday\b/i,
  /\blast\s+(week|month|year)\b/i,
  /\bthis\s+(week|month|year)\b/i,
]

const personalPatterns = [
  /\bmy\b/i,
  /\bmine\b/i,
  /\bour\b/i,
  /\bours\b/i,
  /\bthis\s+project\b/i,
  /\batlas\b/i,
  /\bjournal\b/i,
  /\bnotes?\b/i,
  /\bmemor(y|ies)\b/i,
  /\bi\s+(wrote|written|worked|used|built|made)\b/i,
  /\bi\u2019ve\b/i,
  /\bi've\b/i,
]

const comparisonPatterns = [
  /\bcompare\b/i,
  /\bcompared\s+to\b/i,
  /\bcorrectly\b/i,
  /\bproperly\b/i,
  /\bbest\s+practice/i,
  /\bright\s+way\b/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
  /\btypical\b/i,
  /\blike\s+a\b/i,
]

function anyMatch(patterns: RegExp[], text: string): boolean {
  return patterns.some((re) => re.test(text))
}

export function routeQuery(text: string): RouteResult {
  const trimmed = text.trim()
  const base = detectIntent(trimmed)

  if (!trimmed) {
    return { mode: 'memory', intent: base.intent, reflectionKeyword: base.reflectionKeyword, queryType: base.queryType }
  }

  if (conversationIntents.has(base.intent)) {
    return {
      mode: 'conversation',
      intent: base.intent,
      reflectionKeyword: base.reflectionKeyword,
      queryType: base.queryType,
    }
  }

  const hasKnowledge = anyMatch(knowledgePatterns, trimmed)
  const hasComparison = anyMatch(comparisonPatterns, trimmed)
  const hasMemoryPattern = anyMatch(memoryPatterns, trimmed)
  const hasPersonal = anyMatch(personalPatterns, trimmed)
  const isMemoryIntent = memoryIntents.has(base.intent)

  const generalContext = hasKnowledge || hasComparison
  const personalContext = hasPersonal || hasMemoryPattern

  let mode: RouteMode
  if (generalContext && personalContext) {
    mode = 'hybrid'
  } else if (generalContext) {
    mode = 'knowledge'
  } else if (personalContext || isMemoryIntent) {
    mode = 'memory'
  } else {
    mode = 'memory'
  }

  return {
    mode,
    intent: base.intent,
    reflectionKeyword: base.reflectionKeyword,
    queryType: base.queryType,
  }
}
