export interface EntrySearchResult {
  id: string
  date: string
  title: string
  preview: string
}

export interface EntitySearchResult {
  id: string
  entityType: string
  value: string
  occurrenceCount: number
}

export interface SearchResults {
  entries: EntrySearchResult[]
  entities: EntitySearchResult[]
}
