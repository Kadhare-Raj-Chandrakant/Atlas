export interface RelatedEntity {
  id: string
  entityType: string
  value: string
  occurrenceCount: number
  relationshipWeight: number
}

export interface RelatedEntitiesResponse {
  center: RelatedEntity
  related: RelatedEntity[]
}

export interface GraphNode {
  id: string
  entityType: string
  value: string
  occurrenceCount: number
  radius: number
  x: number
  y: number
  fx: number | null
  fy: number | null
}

export interface GraphLink {
  source: string
  target: string
  weight: number
}
