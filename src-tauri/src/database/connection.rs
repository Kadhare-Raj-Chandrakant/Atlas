use rusqlite::{Connection, Result};
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(path: &str) -> Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Database {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    fn run_migrations(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                date TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL DEFAULT '',
                content_html TEXT NOT NULL DEFAULT '',
                content_text TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS entities (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                value TEXT NOT NULL,
                normalized_value TEXT NOT NULL,
                confidence REAL NOT NULL DEFAULT 1.0,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_entities_type_value ON entities(entity_type, normalized_value);

            CREATE TABLE IF NOT EXISTS entry_entities (
                entry_id TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                PRIMARY KEY (entry_id, entity_id),
                FOREIGN KEY (entry_id) REFERENCES entries(id),
                FOREIGN KEY (entity_id) REFERENCES entities(id)
            );

            CREATE TABLE IF NOT EXISTS relationships (
                id TEXT PRIMARY KEY,
                entity_a_id TEXT NOT NULL,
                entity_b_id TEXT NOT NULL,
                weight INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                UNIQUE(entity_a_id, entity_b_id),
                FOREIGN KEY (entity_a_id) REFERENCES entities(id),
                FOREIGN KEY (entity_b_id) REFERENCES entities(id)
            );",
        )?;
        let _ = conn.execute_batch("ALTER TABLE entities ADD COLUMN confidence REAL NOT NULL DEFAULT 1.0");
        Ok(())
    }
}
