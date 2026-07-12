# Atlas — Architecture

## Overview

Atlas is a Tauri v2 desktop application with a React + TypeScript frontend and a Rust backend. Data is stored locally in SQLite. The frontend uses Zustand for state management, Vite as the build tool, and Tailwind CSS for styling.

## Three-Layer Structure

```
src/
├── core/       Business logic and domain abstractions
├── features/   Feature-scoped modules with owned state
└── shared/     Reusable UI, utilities, theme, and types
```

### Core Layer

Contains domain-level logic that is not tied to any specific feature:

- **atlas/** — Graph engine, knowledge extraction, entity resolution
- **database/** — Data access layer, query builders, connection pooling
- **search/** — Full-text search and retrieval

### Features Layer

Each feature is self-contained with its own components, store, and types:

```
features/
  editor/
    store/      Zustand store owned by the editor
    components/ Editor-specific UI
  graph/
    store/      Graph visualization state
  onboarding/
    store/      Onboarding flow state
```

No global `stores/` folder exists. Every store lives alongside the feature it serves.

### Shared Layer

Reusable infrastructure used across features:

- **ui/** — Primitive UI components (buttons, inputs, modals)
- **layout/** — Structural layout components (AppShell, Sidebar, TopBar, MainContent)
- **hooks/** — Shared React hooks
- **utils/** — Utility functions (cn, formatters, etc.)
- **config/** — Application-wide configuration
- **theme/** — Design tokens and global styles
- **icons/** — Icon component library
- **types/** — Shared TypeScript type definitions

## Backend (Rust)

The Rust backend follows a modular pattern inside `src-tauri/src/`:

```
commands/     Tauri IPC command handlers
database/     Connection management and migrations
errors/       Application error types
models/       Data structures and domain types
repositories/ Database query logic
```

## Data Flow

1. User interacts with the React frontend
2. Feature component dispatches actions via its Zustand store
3. Store calls into `core/` layer for domain logic
4. Core layer invokes Rust commands via `@tauri-apps/api`
5. Rust commands handle SQLite via `tauri-plugin-sql`
6. Results flow back through the same chain

## State Management

- Each feature owns a dedicated Zustand store
- Cross-feature communication happens through shared core abstractions, not shared state
- Persistent state is written to SQLite via the Rust backend
