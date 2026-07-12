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
