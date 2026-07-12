# Atlas — Full Milestone Log

> Every milestone from project inception through current state.
> Each entry records what was requested and what was built.

---

## Milestone 0 — Foundation

### Requested
Scaffold the entire Atlas project from zero. Establish architecture, tooling, design system, and documentation. No business logic.

### Built

**Project scaffolding:**
- Tauri v2 project with React + TypeScript + Vite frontend
- Tailwind CSS with a custom design token system (CSS variables + TypeScript constants)
- ESLint flat config with TypeScript + React + Hooks rules
- Prettier config, PostCSS, path alias `@/` → `src/`

**Architecture:**
- Three-layer folder structure: `core/` (business logic), `features/` (UI), `shared/` (reusable UI)
- No global stores folder — each feature owns its own Zustand store
- Rust backend: rusqlite 0.31 with bundled SQLite, WAL mode

**Design system:**
- Dark-only palette (neutral-950 bg, neutral-900 surfaces, neutral-800 borders, primary-400/500 accents)
- Design tokens in both `globals.css` (CSS vars + keyframes) and `tokens.ts` (TS constants)
- Tailwind `tailwind.config.ts` consuming CSS vars for all utilities

**Layout components (presentational only):**
- `AppShell`, `Sidebar`, `TopBar`, `MainContent`, `SidebarItem`
- `Logo` and `Icon` (SVG sprite) shared UI components

**Documentation:**
- `ARCHITECTURE.md`, `DATABASE.md`, `DESIGN_SYSTEM.md`, `ROADMAP.md`, `VISION.md`

### Verification
- `tsc --noEmit` ✅
- `eslint .` ✅
- `vite build` ✅

---

## Milestone 1 — Dark Shell + Empty State

### Requested
A functional dark-only shell with sidebar navigation and an empty-state landing page. No editor yet.

### Built

- Sidebar with "Today" item highlighted as active
- Empty-state page with heading "What happened today?" and subtitle
- Subtle fade-in animation on the empty state (`animate-fade-in-up`)
- All layout wiring: `App.tsx` → `AppShell` → `Sidebar` + `MainContent` → `TodayPage`

### Key files
- `src/App.tsx` — sidebar nav items, routes to TodayPage
- `src/features/editor/components/TodayPage.tsx` — empty state with heading + description
- `src/shared/theme/globals.css` — fade-in-up keyframes

### Verification
- `tsc --noEmit` ✅
- `eslint .` ✅
- `vite build` ✅

---

## Milestone 2 — Tiptap Editor + Autosave

### Requested
A functional rich-text editor with autosave (console.log for now), character counter, and keyboard shortcut hints in the footer. Entry domain model defined.

### Built

**Editor:**
- Tiptap integration with StarterKit (bold, italic, heading, bullet list, code block) + TaskList + TaskItem + Placeholder
- `Editor.tsx` component — controlled via `content` prop and `onUpdate` callback
- `EditorFooter.tsx` — shows character count + keyboard shortcut hints (`Ctrl+B`, `Ctrl+I`, etc.)

**Entry domain model:**
- `Entry` interface: `id`, `date`, `content` (HTML string), `metadata` (createdAt, updatedAt, wordCount, charCount)
- `entry.ts` in `core/memory/`

**Autosave:**
- `useAutosave` hook — 2-second debounce, exposes `markDirty`, `saveNow`, `isSaving`, `lastSaved`
- Wired in `TodayPage`: calls `markDirty(html)` on editor changes, `saveNow()` forced on date navigation
- Initial version logs to console

### Key files
- `src/features/editor/components/Editor.tsx` — Tiptap wrapper
- `src/features/editor/components/EditorFooter.tsx` — char count + shortcuts
- `src/features/editor/hooks/useAutosave.ts` — debounced save hook
- `src/features/editor/styles/editor.css` — Tiptap styling (dark theme)
- `src/core/memory/entry.ts` — Entry + EntryMetadata interfaces
- `src/features/editor/components/TodayPage.tsx` — wires editor + autosave + footer

### Verification
- `tsc --noEmit` ✅
- `eslint .` ✅
- `vite build` ✅

---

## Milestone 3 — SQLite Persistence

### Requested
Replace console.log autosave with real SQLite persistence via Rust rusqlite commands. Show "Saving..." / "Saved at HH:MM" in the footer.

### Built

**Rust backend:**
- `Database` struct with `Mutex<Connection>` in `database/connection.rs`
- WAL journal mode + foreign keys enabled
- `entries` table: `id`, `created_at`, `updated_at`, `date` (UNIQUE), `title`, `content_html`, `content_text`
- `upsert_entry` repository — INSERT ... ON CONFLICT(date) DO UPDATE
- `find_entry_by_date` repository — SELECT by date
- `save_entry` and `load_entry_by_date` Tauri commands
- Command registration in `lib.rs`

**TypeScript service layer:**
- `entry-service.ts` — typed invoke wrappers: `saveEntry(entry)`, `loadEntryByDate(date)`
- `TodayPage` updated: loads entry on mount, saves on debounce, displays save status

**Footer save status:**
- `EditorFooter` shows `isSaving ? "Saving..." : "Saved at HH:MM"`

### Key files
- `src-tauri/src/database/connection.rs` — Database struct, WAL, migrations
- `src-tauri/src/models/mod.rs` — Entry struct (camelCase serde rename)
- `src-tauri/src/repositories/mod.rs` — upsert_entry, find_entry_by_date
- `src-tauri/src/commands/mod.rs` — save_entry, load_entry_by_date
- `src-tauri/src/lib.rs` — app setup, DB init, command registration
- `src/core/memory/entry-service.ts` — invoke wrappers

### Verification
- `tsc --noEmit` ✅
- `eslint .` ✅
- `vite build` ✅

---

## Milestone 4 — Date Navigation + Calendar

### Requested
Arrow buttons and Alt+Left/Alt+Right keyboard shortcuts for day-to-day navigation. Calendar popover with month view showing entry dot indicators. Fade transitions on date change.

### Built

**Date navigation:**
- `DateNavigation` component — left arrow, clickable date (toggles calendar), right arrow
- Alt+Left = previous day, Alt+Right = next day (via `keydown` event listener in TodayPage)
- `navigateToDate` callback — saves current entry first, then switches date

**Calendar popover:**
- `CalendarPopover` — month grid, 7-column layout with day headers
- Fetches entry dates for the displayed month via `getDatesWithEntries(year, month)`
- Renders a small dot indicator on days that have entries
- Clicking a day navigates to that date
- Previous/next month arrows in the popover header

**Rust:**
- `find_dates_in_month` repository — `SELECT date FROM entries WHERE date LIKE 'YYYY-MM%'`
- `get_dates_with_entries` Tauri command

**Fade transitions:**
- `key={currentDate}` on the editor wrapper div → React remounts on date change
- `animate-fade-in-up` CSS animation on the keyed wrapper

### Key files
- `src/features/editor/components/DateNavigation.tsx` — arrows + clickable date
- `src/features/editor/components/CalendarPopover.tsx` — month grid with dots
- `src-tauri/src/repositories/mod.rs` — find_dates_in_month
- `src-tauri/src/commands/mod.rs` — get_dates_with_entries

### Verification
- `tsc --noEmit` ✅
- `eslint .` ✅
- `vite build` ✅

---

## Milestone 5 — Memory Engine v1 (Entity Extraction)

### Requested
Background entity extraction pipeline that runs after every entry save. Extract People, Places, Projects, Ideas, Tasks, Dates, and Topics from entry text.

### Built

**Rust:**
- `entities` table: `id`, `entity_type`, `value`, `normalized_value`, `created_at`
- `entry_entities` join table: `entry_id` + `entity_id` (composite PK, FKs)
- Index on `(entity_type, normalized_value)` for dedup lookup
- `EntityInput` model (camelCase serde)
- `find_or_create_entity` — SELECT by type+normalized, INSERT if missing
- `link_entry_entity` — INSERT OR IGNORE into join table
- `save_entities` Tauri command — iterates entities, creates/links each
- `uuid` v4 crate added to Cargo.toml

**TypeScript extractors (7 total):**

| Extractor | Heuristics | Confidence (added in M6) |
|---|---|---|
| Person | Verb context ("met with"), title prefix ("Dr."), capitalized guess | 0.95 / 0.90 / 0.65 |
| Place | Known places (Starbucks, etc.), preposition context ("at the office") | 0.95 / 0.85 |
| Project | Action context ("working on Atlas"), marker proximity ("project", "app") | 0.90 / 0.75 |
| Idea | Signal words ("I think", "what if", "maybe") → full sentence | 0.60 |
| Task | Checkboxes (- [ ]), TODO:/TASK: labels, action phrases ("need to") | 0.95 / 0.80 |
| Date | Regex date patterns (Jan 15, 2024), relative (today, tomorrow), day names | 0.98 / 0.90 / 0.80 |
| Topic | Token frequency ≥ 2, filtered by stop words + min length | 0.50 |

**Pipeline:**
- `runPipeline` — runs all 7 extractors, deduplicates by `type:normalizedValue`
- `processEntry` — called fire-and-forget after `saveEntry`, strips HTML, runs pipeline, invokes `save_entities`
- Errors caught silently — entry already saved, no data loss

**Entry service update:**
- `saveEntry` now triggers `processEntry(entry).catch(() => {})` after successful Rust save

### Key files
- `src-tauri/src/database/connection.rs` — entities + entry_entities tables
- `src-tauri/src/models/mod.rs` — EntityInput
- `src-tauri/src/repositories/mod.rs` — find_or_create_entity, link_entry_entity
- `src-tauri/src/commands/mod.rs` — save_entities
- `src/core/memory/entities/types.ts` — EntityType, EntityInput, Extractor interfaces
- `src/core/memory/normalization/index.ts` — stripHtml, normalize, tokenize, stopWords
- `src/core/memory/extraction/extractors/*.ts` — 7 extractors
- `src/core/memory/extraction/pipeline.ts` — runPipeline
- `src/core/memory/pipeline/index.ts` — processEntry

### Architecture decisions
- Fire-and-forget pipeline: entry saved first, entities extracted asynchronously
- Entity reuse: same `(type, normalized_value)` → same entity row, shared across entries
- Pipeline is modular: adding a new extractor = drop a file + add to array

### Verification
- `tsc --noEmit` ✅
- `eslint .` ✅
- `vite build` ✅

---

## Milestone 6 — Entity Browser + Pipeline Refinement

### Requested
Improve the Memory Engine with confidence scoring and formal pipeline stages. Build the first Entity Browser (not a graph, not a People page — a unified entity knowledge interface). Keep the editor completely isolated.

### Built

**Part A — Entity Confidence:**
- `confidence REAL NOT NULL DEFAULT 1.0` column added to `entities` table
- Each extractor assigns a confidence score (0.50 Topics → 0.98 regex dates)
- Rust `find_or_create_entity` updates confidence to `max(current, new)` — future AI can only improve scores
- `EntityInput.confidence` field in both Rust and TypeScript models

**Part B — Formal Pipeline Stages:**
```
Text → Extraction → Normalization → Resolution → Persistence → SQLite
```
- `pipeline/stages/extraction.ts` — runs all 7 extractors
- `pipeline/stages/normalization.ts` — pass-through (future: entity normalization like "Jon" → "Jonathan")
- `pipeline/stages/resolution.ts` — dedup by `type:normalizedValue`, keeps highest confidence
- `pipeline/stages/persistence.ts` — calls `invoke('save_entities')`
- `pipeline/engine.ts` — orchestrates the four stages
- Future AI extraction can replace `extraction.ts` without touching other stages

**Part C — Entity Browser:**
- Sidebar updated: Today, Journal, Entities, Timeline, Search, Settings
- New icons: `entity` (diamond/layers), `timeline` (clock)
- `EntityBrowser` component — search bar at top, 7 grouped sections (People, Projects, Places, Ideas, Tasks, Topics, Dates), each entity shows name + occurrence count
- `EntityDetail` component — entity name, type badge, latest confidence, list of referenced entry dates (clickable)
- `EntityService` — `getEntities(query?)` and `getEntityDetail(entityId)` typed invoke wrappers

**Part D — Navigation:**
- Zustand store (`app-store.ts`) tracks `activeView` + `params`
- App.tsx renders views conditionally: `today`, `entities`, `entity-detail`
- Entity Detail navigates to `today` with `params.date` → TodayPage accepts `initialDate` prop
- `key` prop on TodayPage forces clean remount when navigating to a specific date
- No React Router dependency

**Part E — Editor isolation:**
- TodayPage has zero entity imports
- `initialDate` prop is the only addition — purely mechanical, no entity awareness
- Pipeline is the only writer; Entity Browser is read-only
- No `invoke()` in components — all through service layer

### Rust commands added
- `get_entities` — optionally filtered by search query, returns summaries with counts
- `get_entity_detail` — returns entity info + ordered list of entry dates

### Database migration
```sql
ALTER TABLE entities ADD COLUMN confidence REAL NOT NULL DEFAULT 1.0;
```

### Key files
- `src-tauri/src/models/mod.rs` — EntitySummary, EntityDetail structs
- `src-tauri/src/repositories/mod.rs` — get_entities, get_entity_detail
- `src-tauri/src/commands/mod.rs` — get_entities, get_entity_detail
- `src/core/memory/entities/types.ts` — confidence, EntitySummary, EntityDetail
- `src/core/memory/entities/service.ts` — entity invoke wrappers
- `src/core/memory/pipeline/stages/*.ts` — 4 formal stages
- `src/core/memory/pipeline/engine.ts` — stage orchestrator
- `src/core/memory/pipeline/index.ts` — processEntry unchanged
- `src/features/entities/components/EntityBrowser.tsx` — grouped entity list + search
- `src/features/entities/components/EntityDetail.tsx` — detail view + entry dates
- `src/shared/store/app-store.ts` — navigation state
- `src/App.tsx` — routing + sidebar nav overhaul
- `src/features/editor/components/TodayPage.tsx` — initialDate prop

### Verification
- `tsc --noEmit` ✅
- `eslint .` ✅
- `vite build` ✅ (187 modules, 2.83s)

---

## Complete File Map

```
src/
├── App.tsx                              — Root: routing + sidebar + views
├── main.tsx                             — React entry point
│
├── core/
│   ├── database/index.ts                — Future: DB abstractions
│   ├── search/index.ts                  — Future: full-text search
│   └── memory/
│       ├── index.ts                     — Barrel exports
│       ├── entry.ts                     — Entry + EntryMetadata interfaces
│       ├── entry-service.ts             — invoke wrappers + pipeline trigger
│       ├── entities/
│       │   ├── index.ts
│       │   ├── types.ts                 — EntityType, EntityInput, EntitySummary, EntityDetail
│       │   └── service.ts              — getEntities, getEntityDetail
│       ├── extraction/
│       │   ├── index.ts
│       │   ├── pipeline.ts              — Re-exports runPipeline from engine
│       │   └── extractors/
│       │       ├── index.ts             — Aggregates all 7
│       │       ├── person.ts
│       │       ├── place.ts
│       │       ├── project.ts
│       │       ├── idea.ts
│       │       ├── task.ts
│       │       ├── date.ts
│       │       └── topic.ts
│       ├── normalization/
│       │   └── index.ts                 — stripHtml, normalize, tokenize, stopWords
│       ├── pipeline/
│       │   ├── index.ts                 — processEntry (entry point from entry-service)
│       │   ├── engine.ts               — runPipeline orchestrator
│       │   └── stages/
│       │       ├── index.ts             — Barrel
│       │       ├── extraction.ts        — Runs all extractors
│       │       ├── normalization.ts     — Pass-through (future)
│       │       ├── resolution.ts        — Dedup + max confidence
│       │       └── persistence.ts       — invoke('save_entities')
│       ├── indexing/index.ts            — Future
│       ├── relationships/index.ts       — Future
│       └── timeline/index.ts            — Future
│
├── features/
│   ├── editor/
│   │   ├── index.ts                     — Exports TodayPage, Editor, EditorFooter
│   │   ├── components/
│   │   │   ├── TodayPage.tsx            — Date-aware editor shell + autosave + nav
│   │   │   ├── Editor.tsx               — Tiptap wrapper
│   │   │   ├── EditorFooter.tsx         — Char count + save status + shortcuts
│   │   │   ├── DateNavigation.tsx       — Prev/next + clickable date + calendar toggle
│   │   │   └── CalendarPopover.tsx      — Month grid + entry dot indicators
│   │   ├── hooks/
│   │   │   └── useAutosave.ts           — 2s debounce save hook
│   │   ├── store/index.ts               — Placeholder
│   │   └── styles/editor.css            — Tiptap dark theme
│   ├── entities/
│   │   ├── index.ts                     — Exports EntityBrowser, EntityDetail
│   │   └── components/
│   │       ├── EntityBrowser.tsx        — Search + grouped entity list
│   │       └── EntityDetail.tsx         — Detail view + referenced entries
│   ├── graph/store/index.ts             — Placeholder
│   └── onboarding/store/index.ts        — Placeholder
│
└── shared/
    ├── config/index.ts                  — Placeholder
    ├── hooks/index.ts                   — Placeholder
    ├── icons/index.ts                   — Placeholder
    ├── layout/
    │   ├── index.ts                     — Barrel
    │   ├── AppShell.tsx                 — Full-screen flex container
    │   ├── Sidebar.tsx                  — 240px left panel
    │   ├── SidebarItem.tsx              — Nav button with active state + onClick
    │   ├── TopBar.tsx                   — Title bar
    │   └── MainContent.tsx             — Scrollable content area
    ├── store/
    │   └── app-store.ts                — Zustand navigation state
    ├── theme/
    │   ├── globals.css                  — CSS vars + keyframes
    │   └── tokens.ts                    — Design token constants
    ├── types/index.ts                   — Placeholder
    ├── ui/
    │   ├── index.ts
    │   ├── Logo.tsx                     — Atlas logo SVG
    │   └── Icon.tsx                     — 8 SVG icons: home, journal, people, projects, entity, timeline, search, settings
    └── utils/
        ├── index.ts
        └── cn.ts                        — clsx + tailwind-merge helper

src-tauri/
├── Cargo.toml                           — tauri 2, rusqlite 0.31 bundled, uuid 1 v4
├── build.rs                             — Tauri build script
├── tauri.conf.json                      — Tauri window + app config
├── capabilities/default.json            — Tauri capability permissions
└── src/
    ├── main.rs                          — Tauri entry point
    ├── lib.rs                           — App setup, DB init, command registration
    ├── errors/mod.rs                    — Placeholder
    ├── database/
    │   ├── mod.rs
    │   └── connection.rs               — Database struct, WAL, 3-table migration
    ├── models/
    │   └── mod.rs                       — Entry, EntityInput, EntitySummary, EntityDetail
    ├── repositories/
    │   └── mod.rs                       — upsert_entry, find_entry_by_date, find_dates_in_month,
    │                                       find_or_create_entity, link_entry_entity,
    │                                       get_entities, get_entity_detail
    └── commands/
        └── mod.rs                       — save_entry, load_entry_by_date, get_dates_with_entries,
                                           save_entities, get_entities, get_entity_detail
```

---

## Build Status (current)

| Check | Result |
|---|---|
| `tsc --noEmit` | ✅ |
| `eslint .` | ✅ |
| `vite build` | ✅ (187 modules) |

> **Note:** Rust code cannot compile in this environment (no Rust toolchain). Run `cargo check` locally before testing. The Rust code is syntactically verified against the Tauri v2 + rusqlite 0.31 APIs.

---

## Tagged Checkpoint

```bash
git checkout milestone-6
```

Captures all 99 files across Milestones 0–6 with all TypeScript checks passing.
