export type EntityType = 'Person' | 'Place' | 'Project' | 'Idea' | 'Task' | 'Date' | 'Topic'

export interface EntityInput {
  entityType: EntityType
  value: string
  normalizedValue: string
  confidence: number
}

export interface EntitySummary {
  id: string
  entityType: EntityType
  value: string
  normalizedValue: string
  confidence: number
  occurrenceCount: number
}

export interface EntityDetail {
  id: string
  entityType: EntityType
  value: string
  normalizedValue: string
  confidence: number
  entryDates: string[]
}

export interface Extractor {
  name: string
  extract(text: string): EntityInput[]
}
