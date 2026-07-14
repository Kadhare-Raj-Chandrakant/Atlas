# Atlas — Project State

> Rewritten every milestone. For permanent rules see `AI_SPEC.md`; for history see
> `CHANGELOG.md`.

## Current Milestone
**Milestone 15 — Local AI Conversations (RAG v1)** (complete)

## Progress
**15 / 15 Milestones Complete** — all planned milestones are done.

## Completed Milestones
0 Foundation · 1 Dark Shell · 2 Editor + Autosave · 3 SQLite Persistence ·
4 Date Nav + Calendar · 5 Memory Engine v1 · 6 Entity Browser · 7 Memory Search ·
8 Memory Explorer · 9 Memory Insights · 10 Polish · 11 Knowledge Graph v1
(global view added) · 12 Atlas AI (Memory Recall) · 13 Conversational Intelligence ·
14 AI Provider System (Local-First) · 15 Local AI Conversations (RAG v1)

## Current Architecture
- **Desktop:** Tauri v2 (Rust + webview). Launched via `npm run tauri:dev`.
- **Frontend:** React 18 + TypeScript + Vite 6 + Tailwind (dark-only) + Zustand 4.
- **Backend:** Rust `rusqlite` (bundled SQLite, WAL). IPC via Tauri `invoke`.
- **Layers:** `core/` (logic) · `features/` (vertical slices, each with own store) ·
  `shared/` (UI/layout/theme/utils) · `src-tauri/src/` (commands/repositories/models).
- **AI:** `features/ai/` (Provider Manager + Ollama provider + store + settings).
  Assistant talks to providers **only** through `aiManager` / `useAIStore`.
- UI never calls `invoke()` directly; all DB access via per-feature `*-service.ts`.

## Current Implemented Features
- **Today editor:** Tiptap rich text, debounced autosave to SQLite, date navigation,
  calendar popover, multi-session daily accumulation ("Earlier notes from today").
- **Memory engine:** heuristic entity extraction (Person, Place, Project, Idea, Task,
  Date, Topic) with confidence; relationships via co-occurrence; automatic Date entity.
- **Entity Browser + Detail**, **Memory Search** (grouped, keyboard nav, highlight).
- **Memory Explorer:** force-directed neighborhood graph; **Global Knowledge Graph**
  (up to 1000 nodes / 3000 links); focus/hover/tooltip/zoom/pan; Obsidian-style dock.
- **Memory Insights:** activity, streaks, top entities, heatmap, relationship highlights.
- **Assistant:** right-side resizable panel. Rule-based retrieval engine (Milestones
  12–13) + local LLM RAG (Milestone 15). Intent detection → optional memory retrieval
  → context (with current date) → Ollama (streaming, `generate()` fallback) →
  response. Recent conversation kept in memory (~10 exchanges, session-only). Citations
  link to source entries. Automatic rule-based fallback when no local LLM is available.
- **AI Provider System:** provider manager, Ollama (model discovery + streaming),
  placeholder providers, Settings AI section, localStorage persistence, non-blocking
  startup check.

## Pending Milestones
None in the roadmap — all 15 milestones are complete.

## Optional Future Work (out of scope, not planned)
Permanent AI memory, journal summarization, tool calling, cloud providers.

## Known Issues
- `vite build` emits a cosmetic "chunk > 500 kB" advisory (bundle ~595 kB). Not an
  error; build succeeds. Could be addressed later via code-splitting if desired.
- No functional defects or open bugs.
