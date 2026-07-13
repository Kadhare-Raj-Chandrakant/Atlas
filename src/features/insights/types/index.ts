export interface EntityInsightItem {
  id: string
  value: string
  entityType: string
  count: number
}

export interface EntryInsightItem {
  id: string
  date: string
  title: string
  preview: string
}

export interface DayActivity {
  date: string
  count: number
}

export interface RelationshipInsightItem {
  weight: number
  entityAId: string
  entityAValue: string
  entityAType: string
  entityBId: string
  entityBValue: string
  entityBType: string
}

export interface MemoryInsights {
  totalEntries: number
  totalEntities: number
  totalRelationships: number
  daysWritten: number
  currentStreak: number
  longestStreak: number
  topPeople: EntityInsightItem[]
  topPlaces: EntityInsightItem[]
  topProjects: EntityInsightItem[]
  topIdeas: EntityInsightItem[]
  topTopics: EntityInsightItem[]
  dailyActivity: DayActivity[]
  recentEntries: EntryInsightItem[]
  topRelationships: RelationshipInsightItem[]
  avgWordsPerEntry: number
  avgEntitiesPerEntry: number
  avgRelationshipsPerEntry: number
}
