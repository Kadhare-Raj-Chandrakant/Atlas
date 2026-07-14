# Atlas — Architecture & Development Rules (Permanent)

This file is the **permanent** source of truth for Atlas architecture and development rules.
It does NOT change between milestones. Milestone history lives in `CHANGELOG.md`; current
state lives in `PROJECT_STATE.md`. This file should only be edited when a permanent rule or
architectural decision changes.

---

## Project Vision

Atlas is a **local-first desktop application** that automatically builds a connected
knowledge graph from natural writing. The user writes naturally; Atlas remembers and
connects everything else. No cloud dependency, ever.

- The user should never need to organize (no folders, tags, or manual linking).
- The graph emerges from writing, not the other way around.
- Performance is a feature — every interaction must feel instant.
- Ship a clear, focused product rather than a feature-covered monolith.
- Prefer boring, reliable technology over novelty.

---

## Core Principles

1. **Local-first and private by default.** All data stays on the user's device.
2. **Zero overhead for the user** — they only need to write.
3. **The retrieval layer is the source of truth for memory** — never fabricate or invent.
4. **Architecture is layered and isolated** — features own their state; the UI never
   touches the database directly.
5. **Graceful degradation** — the app must remain fully usable even when optional
   services (e.g., Ollama) are unavailable.
6. **Documentation is part of the work** — a milestone is not complete until
   `CHANGELOG.md` is updated.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 (Rust backend + OS webview) |
| Frontend | React 18, TypeScript 5, Vite 6 |
| Styling | Tailwind CSS 3, dark-only design tokens |
| State | Zustand 4 (one store per feature) |
| Editor | Tiptap (ProseMirror) |
| Graph rendering | d3-force (force simulation) + SVG |
| Backend | Rust, `rusqlite` 0.31 (bundled SQLite, WAL mode) |
| IPC | Tauri `invoke` commands (`@tauri-apps/api/core`); capability-based security |
| AI (optional) | Ollama local HTTP API (`http://localhost:11434`) behind a Provider Manager |
| Lint/Format | ESLint 9 (flat config) + Prettier 3 + typescript-eslint |
| Path alias | `@/` → `src/` |

The app is launched via **`npm run tauri:dev`** (Tauri desktop build), not plain
`npm run dev`.

---

## Architecture

### Three-Layer Frontend Structure

```
src/
├── core/       Pure business logic / domain abstractions (no React, no Tauri UI)
│   ├── database/            (placeholder / shared DB abstractions)
│   ├── memory/              Entity extraction, normalization, pipeline, relationships
│   └── search/              (placeholder / shared search abstractions)
├── features/   Feature-scoped modules — each owns its components, store, services, types
│   ├── editor/    Today page, Tiptap editor, autosave, date navigation
│   ├── entities/  Entity browser + detail
│   ├── graph/     Memory Explorer (neighborhood) + Global Knowledge Graph
│   ├── insights/  Memory Insights dashboard
│   ├── search/    Unified local search
│   ├── assistant/ Rule-based + RAG assistant (chat panel)
│   └── ai/        AI Provider System (managers, providers, settings, store)
└── shared/     Reusable infrastructure
    ├── ui/        Primitive components (Logo, Icon)
    ├── layout/    AppShell, Sidebar, TopBar, MainContent, SidebarItem
    ├── store/     Cross-feature navigation store (app-store.ts)
    ├── theme/     Design tokens (globals.css) + tailwind config
    ├── utils/     cn (clsx + tailwind-merge), formatters
    ├── types/     Shared types
    └── hooks/     Shared React hooks
```

### Backend (Rust — `src-tauri/src/`)

```
commands/     Tauri IPC command handlers (thin; delegate to repositories)
database/     Connection management (Mutex<Connection>), migrations
errors/       Application error types
models/       Data structures / domain types (camelCase serde rename)
repositories/ All SQL query logic (the only place SQL lives)
```

### Data Flow

1. User interacts with a React component.
2. Component dispatches via its **feature Zustand store**.
3. Store calls a **typed service layer** (e.g. `*-service.ts`) that wraps `invoke()`.
4. Tauri `invoke` → Rust command → repository (SQL via `rusqlite`) → SQLite.
5. Results flow back through the same chain. **No component ever calls `invoke()`
   directly, and no component ever constructs raw SQL.**

### State Management

- Each feature owns a dedicated Zustand store (no global `stores/` folder).
- Cross-feature navigation uses `shared/store/app-store.ts` (`activeView` + `params`).
- Persistent UI state (panel width, AI provider/model) uses `localStorage`.
- Chat/AI conversation memory is **session-only** (in-memory), never written to SQLite.

---

## Assistant Philosophy

Atlas is a **calm, thoughtful memory companion — not a general chatbot.**

- The assistant helps the user reflect on their **own** journal entries.
- Two cooperative engines:
  - **Rule-based + retrieval engine** (Milestones 12–13): intent detection → existing
    retrieval layer → formatted answer with citations. Always available, no LLM needed.
  - **Local LLM (RAG)** (Milestone 15): when a local model is available, the assistant
    streams natural, memory-grounded answers via the Provider Manager.
- **Conversation flow:** Intent Detection → (optional) Memory Retrieval → Context Builder
  → Provider Manager → Model → Response.
- **Grounding:** when memory is needed, only retrieved journal entries are sent as
  context. The model must answer from that context.
- **Personality:** calm, thoughtful, supportive, concise. Never fabricate journal
  entries, never pretend to remember something not retrieved, never claim emotions or
  consciousness.
- **Fallback:** if no AI provider is available (or it errors), the assistant
  automatically uses the rule-based engine. No errors, no broken UI.

---

## AI Provider Philosophy

- **Local-first.** No cloud providers, no external APIs. Only Ollama is functional;
  OpenAI / Claude / Gemini / LM Studio are placeholder stubs.
- **Uniform provider interface.** Every provider implements the same `AIProvider`
  interface (`initialize`, `isAvailable`, `listModels`, `currentModel`, `setModel`,
  `generate`, `streamGenerate`). Adding a provider = one class + one registration.
- **The Provider Manager is the only entry point.** The assistant (and any UI) talks to
  providers **only** through `aiManager` / `useAIStore`. It must **never** contact
  Ollama (or any provider) directly.
- **Discovery, not hardcoding.** Models are discovered from the provider's API
  (`/api/tags` for Ollama). Nothing is hardcoded.
- **Non-blocking, safe startup.** Ollama availability is checked once at launch with a
  short timeout; failures are caught and never block or crash the app.
- **Streaming with degradation.** Use `streamGenerate()` first; fall back to
  `generate()` automatically if streaming is unavailable or fails.
- **Persistence.** Selected provider + model are saved in `localStorage` and restored on
  launch, validated against the discovered model list.

---

## Coding Rules

1. **CHANGELOG is the project source of truth.** Every milestone MUST append a full
   section to `CHANGELOG.md` before it is considered complete. Never delete prior
   milestones.
2. **No `invoke()` in components.** All backend access goes through a typed service
   layer (`*-service.ts`).
3. **SQL lives only in Rust repositories.** The frontend never builds raw SQL strings.
4. **One Zustand store per feature.** No global store folder; cross-feature state only
   via the navigation store.
5. **Follow the existing architecture and style.** Match nearby code, libraries, and
   naming. Don't introduce new frameworks without checking they're already used.
6. **Don't refactor unrelated code.** Preserve every existing feature when adding new
   ones.
7. **Local-first / no cloud.** No external APIs unless a milestone explicitly requires
   them (and even then, local-only).
9. **TypeScript strictness.** Keep `tsc --noEmit` clean. Use the `@/` alias.
10. **Lint & format.** Keep `eslint .` clean. Prettier for formatting.
11. **Dark-only UI.** Use the design-token palette (neutral surfaces, primary accents).
    Keep Tailwind opacity modifiers working (colors are hex in `tailwind.config.ts`).
12. **Graceful degradation.** Optional services (AI) must never crash or hang the app.
13. **Verification gates are mandatory** before marking any milestone complete (see
    Development Workflow).

---

## Folder Philosophy

- `core/` — pure logic, no UI, no Tauri command handlers. Reusable across features.
- `features/` — self-contained vertical slices. Each has `components/`, `hooks/`,
  `services/`, `types/`, and (optionally) `store/`. Keep features isolated from each
  other; they communicate through `core/` or the navigation store, not by importing one
  another's internals.
- `shared/` — truly cross-cutting primitives only (layout, ui, theme, utils, types).
- `src-tauri/` — backend. Commands stay thin; all SQL in `repositories/`.
- Keep new code in the layer that owns the concern. When in doubt, put business logic in
  `core/`, UI in `features/`, glue in the feature's `services/`.

---

## Development Workflow

1. **Read the docs first:** `CHANGELOG.md` (history + rules), `AI_SPEC.md` (permanent
   rules), `PROJECT_STATE.md` (current state).
2. **Follow the architecture** and existing coding style. Do not refactor unrelated code.
   Preserve every existing feature.
3. **Keep Atlas working without Ollama** (and without any optional service).
4. **Implement**, then run the full verification gate:
   - `cargo check`
   - `cargo test`
   - `tsc --noEmit`
   - `eslint .`
   - `vite build`  (or `npm run build`, which runs typecheck + build)
   All five must pass.
5. **Update documentation:**
   - Append a full milestone section to `CHANGELOG.md` (Prompt, Implementation Summary,
     Files Added/Modified, Architecture Decisions, Manual Tests, Verification, Notes).
   - Rewrite `PROJECT_STATE.md` to reflect the new current state.
6. **Provide an implementation report** (Build Status, Implementation Summary, Files
   Added/Modified, Architecture Decisions, Manual Test Results, Verification).
7. **Run the app** with `npm run tauri:dev` when a live check is needed.
