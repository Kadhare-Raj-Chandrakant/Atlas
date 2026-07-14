use tauri::State;
use crate::database::connection::Database;
use crate::models::{Entry, EntityInput, EntitySummary, EntityDetail, SearchResults, RelatedEntitiesResponse, GlobalGraphResponse, MemoryInsights};

#[tauri::command]
pub fn save_entry(state: State<Database>, entry: Entry) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::upsert_entry(&conn, &entry).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_entry_by_date(state: State<Database>, date: String) -> Result<Option<Entry>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::find_entry_by_date(&conn, &date).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_entities(
    state: State<Database>,
    entry_id: String,
    entities: Vec<EntityInput>,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    for entity in &entities {
        let entity_id =
            crate::repositories::find_or_create_entity(&conn, entity).map_err(|e| e.to_string())?;
        crate::repositories::link_entry_entity(&conn, &entry_id, &entity_id)
            .map_err(|e| e.to_string())?;
    }
    crate::repositories::update_relationships(&conn, &entry_id).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_dates_with_entries(
    state: State<Database>,
    year: i32,
    month: u32,
) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::find_dates_in_month(&conn, year, month).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_entities(
    state: State<Database>,
    query: Option<String>,
) -> Result<Vec<EntitySummary>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::get_entities(&conn, query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn search_all(state: State<Database>, query: String) -> Result<SearchResults, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::search_all(&conn, &query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_related_entities(
    state: State<Database>,
    entity_id: String,
) -> Result<Option<RelatedEntitiesResponse>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::get_related_entities(&conn, &entity_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_global_graph(state: State<Database>) -> Result<GlobalGraphResponse, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::get_global_graph(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_memory_insights(state: State<Database>) -> Result<MemoryInsights, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::get_memory_insights(&conn).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_entity_detail(
    state: State<Database>,
    entity_id: String,
) -> Result<Option<EntityDetail>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::get_entity_detail(&conn, &entity_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn find_entries_between_dates(
    state: State<Database>,
    from_date: String,
    to_date: String,
) -> Result<Vec<Entry>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::find_entries_between_dates(&conn, &from_date, &to_date)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn find_recent_entries(
    state: State<Database>,
    days: i64,
) -> Result<Vec<Entry>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::find_recent_entries(&conn, days).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn find_entries_by_entity_name(
    state: State<Database>,
    entity_name: String,
) -> Result<Vec<Entry>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    crate::repositories::find_entries_by_entity_name(&conn, &entity_name)
        .map_err(|e| e.to_string())
}
