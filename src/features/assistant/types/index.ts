export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  citations?: Citation[]
  isStreaming?: boolean
}

export interface Citation {
  date: string
  preview: string
}

export type QueryType =
  | { type: 'date'; date: string }
  | { type: 'entity'; entityName: string }
  | { type: 'date-range'; from: string; to: string }
  | { type: 'recent'; days: number }
  | { type: 'keyword'; keyword: string }
  | { type: 'unknown'; original: string }

export type IntentType =
  | 'Greeting'
  | 'SmallTalk'
  | 'Gratitude'
  | 'Farewell'
  | 'MemoryRecall'
  | 'EntitySearch'
  | 'WritingHelp'
  | 'Reflection'
  | 'Unknown'
