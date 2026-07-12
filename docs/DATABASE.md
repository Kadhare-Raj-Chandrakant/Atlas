# Atlas — Database

## Technology

SQLite via [`tauri-plugin-sql`](https://v2.tauri.app/plugin/sql/).

## Connection

The database is loaded on demand from the frontend using `@tauri-apps/plugin-sql`:

```ts
import Database from '@tauri-apps/plugin-sql'

const db = await Database.load('sqlite:atlas.db')
```

The connection string resolves relative to the application's data directory.

## Migrations

Migrations are defined in Rust and registered with the SQL plugin builder. Each migration has:

- A unique version number
- A description
- SQL for the upgrade
- A migration kind (Up or Down)

Schema definitions will be added in Milestone 1 when feature requirements are concrete.

## Planned Tables (Milestone 1+)

- **documents** — Document content and metadata
- **entities** — Named entities extracted from text
- **relationships** — Connections between entities
- **document_entities** — Join table linking documents to entities
- **fts_documents** — Full-text search index (FTS5)

## Principles

- All schema changes are tracked via migrations
- Down migrations are provided for rollback
- The Rust repository layer encapsulates all SQL queries
- The frontend never constructs raw SQL strings
