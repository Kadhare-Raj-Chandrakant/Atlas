# Atlas — Roadmap

## Milestone 0: Foundation (current)

Establish the project architecture, tooling, design system, and project documentation. Zero business logic. The codebase is primed for feature development.

## Milestone 1: Core Editor

A functional rich-text editor with persistence. Users can write and save documents locally. Basic document management.

- Tiptap integration
- SQLite schema for documents
- Document CRUD via Rust commands
- Sidebar shows document list

## Milestone 2: Intelligence

Automatic entity extraction and graph construction from written content. The knowledge graph is visible and navigable.

- NLP pipeline for entity extraction
- Graph data model and visualization
- Entity resolution and deduplication
- Backlinks and context surfacing

## Milestone 3: Discovery

Search and retrieval across both text content and graph connections.

- Full-text search via SQLite FTS5
- Semantic similarity search
- Timeline view
- Bidirectional link navigation

## Milestone 4: Polish

Performance, reliability, and user experience hardening.

- Offline-first robustness
- Backup and restore
- Keyboard shortcuts and power user features
- Accessibility audit
- Performance profiling and optimization

## Beyond

- Plugin system
- Mobile companion
- Web export
- Advanced graph queries
