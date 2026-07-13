use atlas_lib::database::connection::Database;
use atlas_lib::models::{Entry, EntityInput};
use atlas_lib::repositories;
use rusqlite::Connection;

// This test reproduces the EXACT database work performed by the
// `save_entities` command (src-tauri/src/commands/mod.rs) and the
// `get_entities` command, using a throwaway temp DB.
//
// The command bodies are:
//   save_entities: for e in &entities { find_or_create_entity(&conn, e); link_entry_entity(&conn, &entry_id, &id); }
//                  update_relationships(&conn, &entry_id);
//   get_entities:  repositories::get_entities(&conn, query)
// So calling the repository functions directly with the same arguments is
// byte-for-byte equivalent to the command path.

#[test]
fn e2e_memory_pipeline() {
    let dir = std::env::temp_dir();
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    let db_path = dir.join(format!("atlas_e2e_{}.db", stamp));
    for suffix in ["", "-wal", "-shm"] {
        let _ = std::fs::remove_file(format!("{}{}", db_path.display(), suffix));
    }

    let db = Database::new(db_path.to_str().unwrap()).expect("db init");
    let conn: &Connection = &db.conn.lock().unwrap();

    let entry_id = "e2e-entry-1".to_string();

    // In the real app `save_entry` (=> upsert_entry) runs BEFORE save_entities,
    // so the entry row must exist for the entry_entities FK to hold.
    let entry = Entry {
        id: entry_id.clone(),
        created_at: "2026-07-14T00:00:00Z".into(),
        updated_at: "2026-07-14T00:00:00Z".into(),
        date: "2026-07-14".into(),
        title: "".into(),
        content_html: "<p>Today I met Rahul at Starbucks to discuss Atlas.</p>".into(),
        content_text: "Today I met Rahul at Starbucks to discuss Atlas.".into(),
    };
    repositories::upsert_entry(conn, &entry).expect("upsert_entry (entry must exist first)");

    // ---- Stage 3 output: the exact EntityInput[] the pipeline returns ----
    let entities = vec![
        EntityInput { entity_type: "Person".into(), value: "Rahul".into(), normalized_value: "rahul".into(), confidence: 0.65 },
        EntityInput { entity_type: "Person".into(), value: "Starbucks".into(), normalized_value: "starbucks".into(), confidence: 0.65 },
        EntityInput { entity_type: "Person".into(), value: "Atlas".into(), normalized_value: "atlas".into(), confidence: 0.65 },
        EntityInput { entity_type: "Place".into(), value: "Starbucks".into(), normalized_value: "starbucks".into(), confidence: 0.95 },
        EntityInput { entity_type: "Date".into(), value: "Today".into(), normalized_value: "today".into(),         confidence: 0.9 },
    ];

    // ---- Stage 4 + Stage 5: the exact invocation payload & received values ----
    println!("=== Stage 4: frontend -> invoke ===");
    println!(
        "invoke(\"save_entities\", {{ entryId: {:?}, entities: [{} items] }})",
        entry_id,
        entities.len()
    );
    println!("\n=== Stage 5: save_entities receives ===");
    println!("entry_id = {:?}", entry_id);
    for (i, e) in entities.iter().enumerate() {
        println!(
            "  entities[{}] = {{ entityType: {:?}, value: {:?}, normalizedValue: {:?}, confidence: {} }}",
            i, e.entity_type, e.value, e.normalized_value, e.confidence
        );
    }

    // ---- Stage 6: exactly what the command does ----
    let mut find_or_create_calls = 0;
    let mut link_calls = 0;
    for e in &entities {
        let _id = repositories::find_or_create_entity(conn, e).expect("find_or_create_entity");
        find_or_create_calls += 1;
        repositories::link_entry_entity(conn, &entry_id, &_id).expect("link_entry_entity");
        link_calls += 1;
    }
    repositories::update_relationships(conn, &entry_id).expect("update_relationships");
    let update_rel_calls = 1;

    println!("\n=== Stage 6: repository call accounting ===");
    println!("find_or_create_entity calls = {}", find_or_create_calls);
    println!("link_entry_entity      calls = {}", link_calls);
    println!("update_relationships   calls = {}", update_rel_calls);

    // ---- Stage 7: SQL verification ----
    let ent_n: i64 = conn.query_row("SELECT COUNT(*) FROM entities", [], |r| r.get(0)).unwrap();
    let link_n: i64 = conn.query_row("SELECT COUNT(*) FROM entry_entities", [], |r| r.get(0)).unwrap();
    let rel_n: i64 = conn.query_row("SELECT COUNT(*) FROM relationships", [], |r| r.get(0)).unwrap();

    println!("\n=== Stage 7: SQLite verification ===");
    println!("SELECT COUNT(*) FROM entities;        => {}", ent_n);
    println!("SELECT COUNT(*) FROM entry_entities;  => {}", link_n);
    println!("SELECT COUNT(*) FROM relationships;   => {}", rel_n);

    print_table(conn, "entities",
        "SELECT id, entity_type, value, normalized_value, confidence, created_at FROM entities ORDER BY entity_type, value");
    print_table(conn, "entry_entities",
        "SELECT entry_id, entity_id FROM entry_entities ORDER BY entry_id, entity_id");
    print_table(conn, "relationships",
        "SELECT id, entity_a_id, entity_b_id, weight, created_at FROM relationships ORDER BY entity_a_id, entity_b_id");

    // ---- Stage 8: get_entities (what the Entity Browser reads) ----
    let summaries = repositories::get_entities(conn, None).expect("get_entities");
    println!("\n=== Stage 8: get_entities() ===");
    println!("get_entities() returned {} rows", summaries.len());
    for s in &summaries {
        println!(
            "  {} | {} | value={} | normalized={} | conf={} | occurrences={}",
            s.id, s.entity_type, s.value, s.normalized_value, s.confidence, s.occurrence_count
        );
    }

    for suffix in ["", "-wal", "-shm"] {
        let _ = std::fs::remove_file(format!("{}{}", db_path.display(), suffix));
    }
}

fn print_table(conn: &Connection, name: &str, sql: &str) {
    use rusqlite::types::Value;
    println!("\n--- TABLE {} ---", name);
    let mut stmt = conn.prepare(sql).unwrap();
    let cols: Vec<String> = stmt.column_names().iter().map(|c| c.to_string()).collect();
    println!("| {} |", cols.join(" | "));
    let rows = stmt
        .query_map([], |row| {
            let mut v = Vec::new();
            for i in 0..cols.len() {
                let val: Value = row.get(i)?;
                v.push(match val {
                    Value::Null => "NULL".to_string(),
                    Value::Integer(n) => n.to_string(),
                    Value::Real(f) => format!("{:.2}", f),
                    Value::Text(t) => t,
                    Value::Blob(b) => format!("<blob {}b>", b.len()),
                });
            }
            Ok(v)
        })
        .unwrap();
    for r in rows {
        let r = r.unwrap();
        println!("| {} |", r.join(" | "));
    }
}
