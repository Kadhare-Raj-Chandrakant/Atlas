use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
    pub date: String,
    pub title: String,
    pub content_html: String,
    pub content_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityInput {
    pub entity_type: String,
    pub value: String,
    pub normalized_value: String,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntitySummary {
    pub id: String,
    pub entity_type: String,
    pub value: String,
    pub normalized_value: String,
    pub confidence: f64,
    pub occurrence_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityDetail {
    pub id: String,
    pub entity_type: String,
    pub value: String,
    pub normalized_value: String,
    pub confidence: f64,
    pub entry_dates: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntrySearchResult {
    pub id: String,
    pub date: String,
    pub title: String,
    pub preview: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntitySearchResult {
    pub id: String,
    pub entity_type: String,
    pub value: String,
    pub occurrence_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResults {
    pub entries: Vec<EntrySearchResult>,
    pub entities: Vec<EntitySearchResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedEntity {
    pub id: String,
    pub entity_type: String,
    pub value: String,
    pub occurrence_count: i64,
    pub relationship_weight: i64,
    pub confidence: f64,
    pub relationship_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedEntitiesResponse {
    pub center: RelatedEntity,
    pub related: Vec<RelatedEntity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntityInsightItem {
    pub id: String,
    pub value: String,
    pub entity_type: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntryInsightItem {
    pub id: String,
    pub date: String,
    pub title: String,
    pub preview: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DayActivity {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipInsightItem {
    pub weight: i64,
    pub entity_a_id: String,
    pub entity_a_value: String,
    pub entity_a_type: String,
    pub entity_b_id: String,
    pub entity_b_value: String,
    pub entity_b_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryInsights {
    pub total_entries: i64,
    pub total_entities: i64,
    pub total_relationships: i64,
    pub days_written: i64,
    pub current_streak: i64,
    pub longest_streak: i64,
    pub top_people: Vec<EntityInsightItem>,
    pub top_places: Vec<EntityInsightItem>,
    pub top_projects: Vec<EntityInsightItem>,
    pub top_ideas: Vec<EntityInsightItem>,
    pub top_topics: Vec<EntityInsightItem>,
    pub daily_activity: Vec<DayActivity>,
    pub recent_entries: Vec<EntryInsightItem>,
    pub top_relationships: Vec<RelationshipInsightItem>,
    pub avg_words_per_entry: f64,
    pub avg_entities_per_entry: f64,
    pub avg_relationships_per_entry: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphLinkData {
    pub source: String,
    pub target: String,
    pub weight: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalGraphResponse {
    pub nodes: Vec<RelatedEntity>,
    pub links: Vec<GraphLinkData>,
}
