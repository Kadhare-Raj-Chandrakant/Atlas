pub mod commands;
pub mod database;
pub mod errors;
pub mod models;
pub mod repositories;

use database::connection::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
            let db_path = app_dir.join("atlas.db");
            let database =
                Database::new(db_path.to_str().unwrap()).expect("failed to initialize database");
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_entry,
            commands::load_entry_by_date,
            commands::get_dates_with_entries,
            commands::save_entities,
            commands::get_entities,
            commands::get_entity_detail,
            commands::search_all,
            commands::get_related_entities,
            commands::get_memory_insights,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
