export interface EntryMetadata {
  id: string
  createdAt: string
  updatedAt: string
  wordCount: number
  charCount: number
}

export interface Entry {
  id: string
  date: string
  content: string
  metadata: EntryMetadata
}
