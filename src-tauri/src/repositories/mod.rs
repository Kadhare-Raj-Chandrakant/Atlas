use rusqlite::{params, Connection, OptionalExtension};
use crate::models::{Entry, EntityInput, EntitySummary, EntityDetail};

pub fn upsert_entry(conn: &Connection, entry: &Entry) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO entries (id, created_at, updated_at, date, title, content_html, content_text)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(date) DO UPDATE SET
            id = excluded.id,
            updated_at = excluded.updated_at,
            title = excluded.title,
            content_html = excluded.content_html,
            content_text = excluded.content_text",
        params![
            entry.id,
            entry.created_at,
            entry.updated_at,
            entry.date,
            entry.title,
            entry.content_html,
            entry.content_text,
        ],
    )?;
    Ok(())
}

pub fn find_entry_by_date(conn: &Connection, date: &str) -> rusqlite::Result<Option<Entry>> {
    let mut stmt = conn.prepare(
        "SELECT id, created_at, updated_at, date, title, content_html, content_text
         FROM entries WHERE date = ?1",
    )?;

    let mut rows = stmt.query_map(params![date], |row| {
        Ok(Entry {
            id: row.get(0)?,
            created_at: row.get(1)?,
            updated_at: row.get(2)?,
            date: row.get(3)?,
            title: row.get(4)?,
            content_html: row.get(5)?,
            content_text: row.get(6)?,
        })
    })?;

    match rows.next() {
        Some(Ok(entry)) => Ok(Some(entry)),
        _ => Ok(None),
    }
}

pub fn find_or_create_entity(
    conn: &Connection,
    input: &EntityInput,
) -> rusqlite::Result<String> {
    let mut stmt = conn.prepare(
        "SELECT id, confidence FROM entities WHERE entity_type = ?1 AND normalized_value = ?2",
    )?;
    let existing: Option<(String, f64)> = stmt
        .query_row(params![input.entity_type, input.normalized_value], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .optional()?;

    if let Some((id, current_confidence)) = existing {
        if input.confidence > current_confidence {
            conn.execute(
                "UPDATE entities SET confidence = ?1, value = ?2 WHERE id = ?3",
                params![input.confidence, input.value, id],
            )?;
        }
        Ok(id)
    } else {
        let id = uuid::Uuid::new_v4().to_string();
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs()
            .to_string();
        conn.execute(
            "INSERT INTO entities (id, entity_type, value, normalized_value, confidence, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, input.entity_type, input.value, input.normalized_value, input.confidence, now],
        )?;
        Ok(id)
    }
}

pub fn get_entities(
    conn: &Connection,
    query: Option<String>,
) -> rusqlite::Result<Vec<EntitySummary>> {
    let (sql, param): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(q) = query {
        let pattern = format!("%{}%", q);
        (
            "SELECT e.id, e.entity_type, e.value, e.normalized_value, e.confidence,
                    COUNT(ee.entry_id) AS occurrence_count
             FROM entities e
             LEFT JOIN entry_entities ee ON ee.entity_id = e.id
             WHERE e.value LIKE ?1 OR e.normalized_value LIKE ?1
             GROUP BY e.id
             ORDER BY e.entity_type, occurrence_count DESC"
                .to_string(),
            vec![Box::new(pattern)],
        )
    } else {
        (
            "SELECT e.id, e.entity_type, e.value, e.normalized_value, e.confidence,
                    COUNT(ee.entry_id) AS occurrence_count
             FROM entities e
             LEFT JOIN entry_entities ee ON ee.entity_id = e.id
             GROUP BY e.id
             ORDER BY e.entity_type, occurrence_count DESC"
                .to_string(),
            vec![],
        )
    };

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = param.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(EntitySummary {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            value: row.get(2)?,
            normalized_value: row.get(3)?,
            confidence: row.get(4)?,
            occurrence_count: row.get(5)?,
        })
    })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

pub fn get_entity_detail(
    conn: &Connection,
    entity_id: &str,
) -> rusqlite::Result<Option<EntityDetail>> {
    let mut stmt = conn.prepare(
        "SELECT id, entity_type, value, normalized_value, confidence
         FROM entities WHERE id = ?1",
    )?;
    let entity = stmt
        .query_row(params![entity_id], |row| {
            Ok(EntityDetail {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                value: row.get(2)?,
                normalized_value: row.get(3)?,
                confidence: row.get(4)?,
                entry_dates: Vec::new(),
            })
        })
        .optional()?;

    if let Some(mut detail) = entity {
        let mut stmt = conn.prepare(
            "SELECT e.date FROM entries e
             INNER JOIN entry_entities ee ON ee.entry_id = e.id
             WHERE ee.entity_id = ?1
             ORDER BY e.date DESC",
        )?;
        let rows = stmt.query_map(params![entity_id], |row| {
            row.get::<_, String>(0)
        })?;
        for row in rows {
            detail.entry_dates.push(row?);
        }
        Ok(Some(detail))
    } else {
        Ok(None)
    }
}

pub fn link_entry_entity(
    conn: &Connection,
    entry_id: &str,
    entity_id: &str,
) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT OR IGNORE INTO entry_entities (entry_id, entity_id) VALUES (?1, ?2)",
        params![entry_id, entity_id],
    )?;
    Ok(())
}

pub fn find_dates_in_month(
    conn: &Connection,
    year: i32,
    month: u32,
) -> rusqlite::Result<Vec<String>> {
    let prefix = format!("{}-{:02}", year, month);
    let mut stmt = conn.prepare("SELECT date FROM entries WHERE date LIKE ?1")?;
    let rows = stmt.query_map(params![format!("{}%", prefix)], |row| {
        row.get::<_, String>(0)
    })?;
    let mut dates = Vec::new();
    for row in rows {
        dates.push(row?);
    }
    Ok(dates)
}
