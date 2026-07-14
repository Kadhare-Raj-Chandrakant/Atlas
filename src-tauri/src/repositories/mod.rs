use rusqlite::{params, Connection, OptionalExtension};
use crate::models::{Entry, EntityInput, EntitySummary, EntityDetail, EntrySearchResult, EntitySearchResult, SearchResults, RelatedEntity, RelatedEntitiesResponse, GlobalGraphResponse, GraphLinkData, MemoryInsights, EntityInsightItem, EntryInsightItem, DayActivity, RelationshipInsightItem};

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

pub fn search_all(
    conn: &Connection,
    query: &str,
) -> rusqlite::Result<SearchResults> {
    let pattern = format!("%{}%", query);

    let mut entry_stmt = conn.prepare(
        "SELECT id, date, title, substr(content_text, 1, 200)
         FROM entries
         WHERE content_text LIKE ?1 OR date LIKE ?1 OR title LIKE ?1
         ORDER BY date DESC
         LIMIT 20",
    )?;

    let entry_rows = entry_stmt.query_map(params![pattern], |row| {
        Ok(EntrySearchResult {
            id: row.get(0)?,
            date: row.get(1)?,
            title: row.get(2)?,
            preview: row.get(3)?,
        })
    })?;

    let mut entries = Vec::new();
    for row in entry_rows {
        entries.push(row?);
    }

    let mut entity_stmt = conn.prepare(
        "SELECT e.id, e.entity_type, e.value, COUNT(ee.entry_id) AS occurrence_count
         FROM entities e
         LEFT JOIN entry_entities ee ON ee.entity_id = e.id
         WHERE e.value LIKE ?1 OR e.normalized_value LIKE ?1
         GROUP BY e.id
         ORDER BY occurrence_count DESC
         LIMIT 20",
    )?;

    let entity_rows = entity_stmt.query_map(params![pattern], |row| {
        Ok(EntitySearchResult {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            value: row.get(2)?,
            occurrence_count: row.get(3)?,
        })
    })?;

    let mut entities = Vec::new();
    for row in entity_rows {
        entities.push(row?);
    }

    Ok(SearchResults { entries, entities })
}

pub fn update_relationships(conn: &Connection, entry_id: &str) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare(
        "SELECT entity_id FROM entry_entities WHERE entry_id = ?1",
    )?;
    let entity_ids: Vec<String> = stmt
        .query_map(params![entry_id], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;

    for i in 0..entity_ids.len() {
        for j in (i + 1)..entity_ids.len() {
            let a = &entity_ids[i];
            let b = &entity_ids[j];
            let (small, large) = if a < b { (a, b) } else { (b, a) };

            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs()
                .to_string();

            let result: Option<String> = conn
                .query_row(
                    "SELECT id FROM relationships WHERE entity_a_id = ?1 AND entity_b_id = ?2",
                    params![small, large],
                    |row| row.get(0),
                )
                .optional()?;

            if let Some(existing_id) = result {
                conn.execute(
                    "UPDATE relationships SET weight = weight + 1 WHERE id = ?1",
                    params![existing_id],
                )?;
            } else {
                let id = uuid::Uuid::new_v4().to_string();
                conn.execute(
                    "INSERT INTO relationships (id, entity_a_id, entity_b_id, weight, created_at)
                     VALUES (?1, ?2, ?3, 1, ?4)",
                    params![id, small, large, now],
                )?;
            }
        }
    }
    Ok(())
}

pub fn get_related_entities(
    conn: &Connection,
    entity_id: &str,
) -> rusqlite::Result<Option<RelatedEntitiesResponse>> {
    let mut center_stmt = conn.prepare(
        "SELECT e.id, e.entity_type, e.value, COUNT(ee.entry_id) AS occurrence_count,
                e.confidence,
                (SELECT COUNT(*) FROM relationships r WHERE r.entity_a_id = e.id OR r.entity_b_id = e.id) AS relationship_count
         FROM entities e
         LEFT JOIN entry_entities ee ON ee.entity_id = e.id
         WHERE e.id = ?1
         GROUP BY e.id",
    )?;
    let center = center_stmt
        .query_row(params![entity_id], |row| {
            Ok(RelatedEntity {
                id: row.get(0)?,
                entity_type: row.get(1)?,
                value: row.get(2)?,
                occurrence_count: row.get(3)?,
                relationship_weight: 0,
                confidence: row.get(4)?,
                relationship_count: row.get(5)?,
            })
        })
        .optional()?;

    let center = match center {
        Some(c) => c,
        None => return Ok(None),
    };

    let mut related_stmt = conn.prepare(
        "SELECT e.id, e.entity_type, e.value, COUNT(ee.entry_id) AS occurrence_count, r.weight,
                e.confidence,
                (SELECT COUNT(*) FROM relationships r2 WHERE r2.entity_a_id = e.id OR r2.entity_b_id = e.id) AS relationship_count
         FROM relationships r
         JOIN entities e ON e.id = CASE WHEN r.entity_a_id = ?1 THEN r.entity_b_id ELSE r.entity_a_id END
         LEFT JOIN entry_entities ee ON ee.entity_id = e.id
         WHERE r.entity_a_id = ?1 OR r.entity_b_id = ?1
         GROUP BY e.id
         ORDER BY r.weight DESC
         LIMIT 50",
    )?;
    let rows = related_stmt.query_map(params![entity_id], |row| {
        Ok(RelatedEntity {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            value: row.get(2)?,
            occurrence_count: row.get(3)?,
            relationship_weight: row.get(4)?,
            confidence: row.get(5)?,
            relationship_count: row.get(6)?,
        })
    })?;

    let mut related = Vec::new();
    for row in rows {
        related.push(row?);
    }

    Ok(Some(RelatedEntitiesResponse { center, related }))
}

pub fn get_global_graph(conn: &Connection) -> rusqlite::Result<GlobalGraphResponse> {
    let mut nodes_stmt = conn.prepare(
        "SELECT e.id, e.entity_type, e.value, COUNT(ee.entry_id) AS occurrence_count,
                0 AS relationship_weight, e.confidence,
                (SELECT COUNT(*) FROM relationships r WHERE r.entity_a_id = e.id OR r.entity_b_id = e.id) AS relationship_count
         FROM entities e
         LEFT JOIN entry_entities ee ON ee.entity_id = e.id
         GROUP BY e.id
         ORDER BY occurrence_count DESC, e.confidence DESC
         LIMIT 1000",
    )?;
    let node_rows = nodes_stmt.query_map([], |row| {
        Ok(RelatedEntity {
            id: row.get(0)?,
            entity_type: row.get(1)?,
            value: row.get(2)?,
            occurrence_count: row.get(3)?,
            relationship_weight: row.get(4)?,
            confidence: row.get(5)?,
            relationship_count: row.get(6)?,
        })
    })?;

    let mut nodes = Vec::new();
    for row in node_rows {
        nodes.push(row?);
    }

    let mut links_stmt = conn.prepare(
        "SELECT entity_a_id, entity_b_id, weight FROM relationships ORDER BY weight DESC LIMIT 3000"
    )?;
    let link_rows = links_stmt.query_map([], |row| {
        Ok(GraphLinkData {
            source: row.get(0)?,
            target: row.get(1)?,
            weight: row.get(2)?,
        })
    })?;

    let mut links = Vec::new();
    for row in link_rows {
        links.push(row?);
    }

    Ok(GlobalGraphResponse { nodes, links })
}

fn parse_date(s: &str) -> (i32, u32, u32) {
    let parts: Vec<i32> = s.split('-').map(|p| p.parse().unwrap()).collect();
    (parts[0], parts[1] as u32, parts[2] as u32)
}

fn is_leap(year: i32) -> bool {
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
}

fn days_in_month(year: i32, month: u32) -> u32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => if is_leap(year) { 29 } else { 28 },
        _ => 0,
    }
}

fn previous_date(date_str: &str) -> String {
    let (y, m, d) = parse_date(date_str);
    if d > 1 {
        format!("{:04}-{:02}-{:02}", y, m, d - 1)
    } else if m > 1 {
        let prev_m = m - 1;
        let prev_days = days_in_month(y, prev_m);
        format!("{:04}-{:02}-{:02}", y, prev_m, prev_days)
    } else {
        format!("{:04}-12-31", y - 1)
    }
}

fn date_diff_days(a: &str, b: &str) -> i64 {
    let (y1, m1, d1) = parse_date(a);
    let (y2, m2, d2) = parse_date(b);
    let days_from_epoch = |y: i32, m: u32, d: u32| -> i64 {
        let mut total = 0i64;
        for year in 0..y {
            total += if is_leap(year) { 366 } else { 365 };
        }
        for month in 1..m {
            total += days_in_month(y, month) as i64;
        }
        total + d as i64
    };
    days_from_epoch(y1, m1, d1) - days_from_epoch(y2, m2, d2)
}

fn compute_streaks(dates: &[String], today: &str) -> (i64, i64) {
    if dates.is_empty() {
        return (0, 0);
    }

    let mut sorted: Vec<&str> = dates.iter().map(|s| s.as_str()).collect();
    sorted.sort_by(|a, b| b.cmp(a));
    sorted.dedup();

    let mut current = 0i64;
    let mut check = today.to_string();
    for &d in &sorted {
        if d == check {
            current += 1;
            check = previous_date(&check);
        } else if d < check.as_str() {
            break;
        }
    }

    let mut longest = 0i64;
    let mut cur = 0i64;
    let mut prev: Option<&str> = None;
    for &d in sorted.iter().rev() {
        if let Some(p) = prev {
            if date_diff_days(p, d) == 1 {
                cur += 1;
            } else {
                longest = longest.max(cur);
                cur = 1;
            }
        } else {
            cur = 1;
        }
        prev = Some(d);
    }
    longest = longest.max(cur);

    (current, longest)
}

fn get_top_entities(conn: &Connection, entity_type: &str, limit: i64) -> rusqlite::Result<Vec<EntityInsightItem>> {
    let mut stmt = conn.prepare(
        "SELECT e.id, e.value, e.entity_type, COUNT(ee.entry_id) AS cnt
         FROM entities e
         JOIN entry_entities ee ON ee.entity_id = e.id
         WHERE e.entity_type = ?1
         GROUP BY e.id
         ORDER BY cnt DESC
         LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![entity_type, limit], |row| {
        Ok(EntityInsightItem {
            id: row.get(0)?,
            value: row.get(1)?,
            entity_type: row.get(2)?,
            count: row.get(3)?,
        })
    })?;
    let mut items = Vec::new();
    for row in rows {
        items.push(row?);
    }
    Ok(items)
}

pub fn get_memory_insights(conn: &Connection) -> rusqlite::Result<MemoryInsights> {
    let today: String = conn
        .query_row("SELECT date('now')", [], |row| row.get(0))
        .unwrap_or_default();

    let total_entries: i64 = conn
        .query_row("SELECT COUNT(*) FROM entries", [], |row| row.get(0))
        .unwrap_or(0);
    let total_entities: i64 = conn
        .query_row("SELECT COUNT(*) FROM entities", [], |row| row.get(0))
        .unwrap_or(0);
    let total_relationships: i64 = conn
        .query_row("SELECT COUNT(*) FROM relationships", [], |row| row.get(0))
        .unwrap_or(0);
    let days_written: i64 = conn
        .query_row("SELECT COUNT(DISTINCT date) FROM entries", [], |row| row.get(0))
        .unwrap_or(0);

    let mut date_stmt = conn.prepare("SELECT DISTINCT date FROM entries ORDER BY date")?;
    let all_dates: Vec<String> = date_stmt
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;

    let (current_streak, longest_streak) = compute_streaks(&all_dates, &today);

    let top_people = get_top_entities(conn, "Person", 10)?;
    let top_places = get_top_entities(conn, "Place", 10)?;
    let top_projects = get_top_entities(conn, "Project", 10)?;
    let top_ideas = get_top_entities(conn, "Idea", 10)?;
    let top_topics = get_top_entities(conn, "Topic", 10)?;

    let mut activity_stmt = conn.prepare(
        "SELECT date, COUNT(*) FROM entries WHERE date >= date('now', '-365 days') GROUP BY date ORDER BY date",
    )?;
    let daily_activity: Vec<DayActivity> = activity_stmt
        .query_map([], |row| {
            Ok(DayActivity {
                date: row.get(0)?,
                count: row.get(1)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut recent_stmt = conn.prepare(
        "SELECT id, date, title, substr(content_text, 1, 150) FROM entries ORDER BY date DESC LIMIT 10",
    )?;
    let recent_entries: Vec<EntryInsightItem> = recent_stmt
        .query_map([], |row| {
            Ok(EntryInsightItem {
                id: row.get(0)?,
                date: row.get(1)?,
                title: row.get(2)?,
                preview: row.get(3)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let mut rel_stmt = conn.prepare(
        "SELECT r.weight, ea.id, ea.value, ea.entity_type, eb.id, eb.value, eb.entity_type
         FROM relationships r
         JOIN entities ea ON ea.id = r.entity_a_id
         JOIN entities eb ON eb.id = r.entity_b_id
         ORDER BY r.weight DESC
         LIMIT 10",
    )?;
    let top_relationships: Vec<RelationshipInsightItem> = rel_stmt
        .query_map([], |row| {
            Ok(RelationshipInsightItem {
                weight: row.get(0)?,
                entity_a_id: row.get(1)?,
                entity_a_value: row.get(2)?,
                entity_a_type: row.get(3)?,
                entity_b_id: row.get(4)?,
                entity_b_value: row.get(5)?,
                entity_b_type: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    let avg_words: f64 = conn
        .query_row(
            "SELECT COALESCE(AVG(CASE WHEN length(trim(content_text)) = 0 THEN 0 ELSE length(trim(content_text)) - length(replace(trim(content_text), ' ', '')) + 1 END), 0) FROM entries",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);
    let avg_entities: f64 = conn
        .query_row(
            "SELECT COALESCE(AVG(cnt), 0) FROM (SELECT COUNT(*) as cnt FROM entry_entities GROUP BY entry_id)",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);
    let avg_relationships: f64 = if total_entries > 0 {
        total_relationships as f64 / total_entries as f64
    } else {
        0.0
    };

    Ok(MemoryInsights {
        total_entries,
        total_entities,
        total_relationships,
        days_written,
        current_streak,
        longest_streak,
        top_people,
        top_places,
        top_projects,
        top_ideas,
        top_topics,
        daily_activity,
        recent_entries,
        top_relationships,
        avg_words_per_entry: (avg_words * 100.0).round() / 100.0,
        avg_entities_per_entry: (avg_entities * 100.0).round() / 100.0,
        avg_relationships_per_entry: (avg_relationships * 100.0).round() / 100.0,
    })
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

pub fn find_entries_between_dates(
    conn: &Connection,
    from_date: &str,
    to_date: &str,
) -> rusqlite::Result<Vec<Entry>> {
    let mut stmt = conn.prepare(
        "SELECT id, created_at, updated_at, date, title, content_html, content_text
         FROM entries WHERE date >= ?1 AND date <= ?2
         ORDER BY date DESC",
    )?;
    let rows = stmt.query_map(params![from_date, to_date], |row| {
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
    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

pub fn find_recent_entries(
    conn: &Connection,
    days: i64,
) -> rusqlite::Result<Vec<Entry>> {
    let offset = format!("-{} days", days);
    let mut stmt = conn.prepare(
        "SELECT id, created_at, updated_at, date, title, content_html, content_text
         FROM entries WHERE date >= date('now', ?1)
         ORDER BY date DESC",
    )?;
    let rows = stmt.query_map(params![offset], |row| {
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
    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

pub fn find_entries_by_entity_name(
    conn: &Connection,
    entity_name: &str,
) -> rusqlite::Result<Vec<Entry>> {
    let pattern = format!("%{}%", entity_name);
    let mut stmt = conn.prepare(
        "SELECT DISTINCT e.id, e.created_at, e.updated_at, e.date, e.title, e.content_html, e.content_text
         FROM entries e
         INNER JOIN entry_entities ee ON ee.entry_id = e.id
         INNER JOIN entities ent ON ent.id = ee.entity_id
         WHERE ent.value LIKE ?1 OR ent.normalized_value LIKE ?1
         ORDER BY e.date DESC",
    )?;
    let rows = stmt.query_map(params![pattern], |row| {
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
    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}
