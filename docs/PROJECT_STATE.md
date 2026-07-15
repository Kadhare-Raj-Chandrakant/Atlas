# Atlas — Project State

> Rewritten every milestone. For permanent rules see `AI_SPEC.md`; for history see
> `CHANGELOG.md`.

## Current Milestone
**Layout Stabilization Pass (Pre-Release 23)** (complete)

## Progress
**19 / 19 Milestones Complete** — all planned milestones are done. Releases 20–22 are
post-milestone interaction refinements built on top of the completed milestone work.

## Completed Milestones
0 Foundation · 1 Dark Shell · 2 Editor + Autosave · 3 SQLite Persistence ·
4 Date Nav + Calendar · 5 Memory Engine v1 · 6 Entity Browser · 7 Memory Search ·
8 Memory Explorer · 9 Memory Insights · 10 Polish · 11 Knowledge Graph v1
(global view added) · 12 Atlas AI (Memory Recall) · 13 Conversational Intelligence ·
14 AI Provider System (Local-First) · 15 Local AI Conversations (RAG v1) ·
16 Intelligent Query Routing · 17 Atlas Co-Writer (Harry Potter Mode) ·
18 Guided Conversations · 19 Living Journal (Conversation Mode)

## Current Architecture
- **Desktop:** Tauri v2 (Rust + webview). Launched via `npm run tauri:dev`.
- **Frontend:** React 18 + TypeScript + Vite 6 + Tailwind (dark-only) + Zustand 4.
- **Backend:** Rust `rusqlite` (bundled SQLite, WAL). IPC via Tauri `invoke`.
- **Layers:** `core/` (logic) · `features/` (vertical slices, each with own store) ·
  `shared/` (UI/layout/theme/utils) · `src-tauri/src/` (commands/repositories/models).
- **AI:** `features/ai/` (Provider Manager + Ollama provider + store + settings).
  Assistant talks to providers **only** through `aiManager` / `useAIStore`.
- UI never calls `invoke()` directly; all DB access via per-feature `*-service.ts`.
- **Co-Writer (Milestone 17 + Release 21 Living Ink):** clear separation of concerns —
  `generateJournalEntry()` in `features/assistant/services/co-writer.ts` decides **WHAT**
  to write (reuses `aiManager`, `useAIStore`, `buildJournalPrompt`, existing streaming);
  the **editor writing service** in `features/editor/services/editor-writing-service.ts`
  decides **HOW** text appears. Streamed tokens are buffered internally and revealed only
  as complete sentences (never character-by-character), each fading in with a subtle blur
  that resolves and a tiny upward movement — so the journal appears to write itself. The
  reveal uses a ProseMirror decoration (`LivingInk` extension) and normal Tiptap
  transactions at the cursor, so undo/redo is preserved and the user can always interrupt
  (type, click, move the cursor, or press Escape). A `useCoWriterStore`
  (`features/editor/store/index.ts`) orchestrates the discussion, the write-confirmation
  gate, and the streaming hand-off.
- **Living Journal / Conversation Mode (Milestone 19 + refinement):** the AI now lives
  *inside* the journal instead of in a floating panel. The same editor container hosts two
  modes via a `mode: 'editor' | 'conversation'` flag on `useCoWriterStore`. A near-invisible
  Liquid-Glass circular toggle (`features/editor/components/ConversationToggle.tsx`) is
  pinned to the right edge of the editor; it is translucent, blurred, ~25% opacity at rest,
  and brightens gently on hover/press. Clicking it does not open a panel — it crossfades the
  editor into `ConversationMode` (`features/editor/components/ConversationMode.tsx`) via a
  shared container, so the page reads as one surface quietly changing state (opacity + blur
  + a small rise), not two screens. The conversation is typeset like a notebook: softly
  labelled passages ("Atlas" / "You"), separated by whitespace rather than bubbles or
  dividers, with the input anchored to the bottom so writing feels continuous. No floating
  window, no side panel, no chat chrome. Conversation history persists in the store for the
  whole session and is never lost on exit. All AI logic (Query Router, Conversation Guide,
  Prompt Builder, RAG, Provider Manager, Memory Retrieval, streaming, interrupt detection,
  writing generation) is reused unchanged — only the presentation layer changed. The old
  floating `CoWriter.tsx` panel was removed.

- **Shared Notebook (Release 22 — Phase 1):** the conversation no longer lives in a separate
  message list or chat input. The same Tiptap editor that holds the journal *is* the
  conversation surface. In conversation mode the committed turns are rendered into the document
  as softly labelled passages ("You" / "Atlas") separated by whitespace, with one empty trailing
  paragraph as the user's live writing space; the user writes directly and presses Enter to share
  a thought (Shift+Enter = newline). Atlas's reply streams straight into the page using the
  existing Living Ink writing service (`prepareInlineResponse()` opens a labelled "Atlas" reply
  space, then `appendChunk`/`finishWriting` reveal the sentence-buffered stream in place), so the
  reply appears inside the notebook rather than in a bubble. A single surface, no chat chrome.
  The store keeps `messages` as the AI's source of truth and re-renders the notebook from it at
  commit and after each reply; `sendMessage` streams the assistant reply inline in conversation
  mode and accumulates it in `pendingAssistant` so an interrupt still captures the partial reply
  as a turn. `TodayPage` no longer blurs the editor or overlays a second surface — the editor is
  always the surface, an Enter-to-commit handler commits the current paragraph, and autosave is
  suppressed in conversation mode so the streamed transcript never overwrites the day's notes.
  `Editor` skips its content-sync effect in conversation mode so the store owns the live document.
  The old `ConversationMode` component (message list + input) became a pointer-events-none
  `ConversationEmptyState` hint shown only before the first turn. Conversation Guide, Prompt
  Builder, RAG, Provider Manager, streaming, interrupt detection, and Living Ink animation are all
  reused unchanged.
- **Conversation Guide (Milestone 18 + Release 20):** a dedicated service
  (`features/assistant/services/conversation-guide.ts`) sits **before** response
  generation and decides whether Atlas continues normally, asks at most one grounded
  follow-up question, encourages reflection, or transitions toward writing today's journal.
  It reuses the Query Router (`routeQuery`), Memory Insights (`getMemoryInsights` — top
  people/places/projects/ideas/topics, knowledge-graph relationships, writing streaks), and
  recent entries; it never touches retrieval or providers directly. `prompt-builder.ts`
  gained an optional `guide` block that instructs the LLM to end with **at most one** grounded
  follow-up question (or gently suggest writing) — never inventing details. Both the AI
  path (`ai-conversation.ts`) and the rule-based fallback (`assistant-service.ts`) route
  through the guide, so Atlas stays proactive with or without a local model, and the
  Co-Writer uses the guide's `transitionToWriting` signal to offer journaling earlier.
  Release 20 refined this into a calmer companion, not a question machine: the guide now
  tracks which entities it has **already asked about** and how many recent turns ended in a
  question, choosing silence instead of piling on; emotional turns receive a varied, soft
  reflection question (or just an acknowledgement when questions have been frequent);
  greetings offer journaling in varied, unhurried wording. The Prompt Builder's identity was
  rewritten so Atlas reads as a **calm companion, not a task-completing assistant** — listen
  more than it speaks, answer directly then expand, vary sentence/paragraph length and tone,
  acknowledge feelings, reference earlier turns, and never repeat what the user just said.
  The rule-based replies (`responses.ts`) were diversified to drop the templated, repetitive
  feel. No retrieval, routing, entity extraction, Knowledge Graph, database, editor,
  Co-Writer, or Provider logic changed.

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
  12–13) + local LLM RAG (Milestone 15) + an intelligent **Query Router** (Milestone 16).
  Flow: Query Router (intent detection → mode) → optional memory retrieval → mode-aware
  context (with current date) → Ollama (streaming, `generate()` fallback) → response.
  The router picks one of four modes so Atlas no longer assumes every question is about
  the journal: **Conversation** (greetings/small talk/thanks/goodbye/writing help — no
  retrieval, no LLM, reuses canned responses), **Knowledge** (general questions go
  straight to the LLM, never touch SQLite; a friendly "connect an AI model" message when
  no provider), **Memory** (existing retrieval pipeline, LLM when available, rule-based
  fallback otherwise), and **Hybrid** (retrieve memories + let the LLM combine general
  knowledge with the journal, clearly separated, never inventing memories). Recent
  conversation kept in memory (~10 exchanges, session-only). Citations link to source
  entries. Automatic rule-based fallback when no local LLM is available.
- **AI Provider System:** provider manager, Ollama (model discovery + streaming),
  placeholder providers, Settings AI section, localStorage persistence, non-blocking
  startup check.
- **Atlas Co-Writer (Harry Potter Mode):** every journal entry is a collaboration. A
  floating Atlas button on the editor opens a compact discussion panel (not the large
  assistant view). Atlas talks with the user, asks follow-up questions, and — once it has
  enough context — offers to write the day's entry. On confirmation it streams a polished,
  first-person entry **directly into the Tiptap editor** at the cursor via normal
  transactions (so undo/redo keeps working). The user always has priority: typing, editing,
  moving the cursor, or pressing Escape stops writing instantly. Writing reuses the existing
  RAG/Query-Router/Prompt-Builder stack — no duplicated AI logic. No AI provider gracefully
  degrades: Atlas explains that direct writing needs a connected local model while the
  journal stays fully usable.
- **Guided Conversations:** Atlas is now proactive, not purely reactive. A Conversation
  Guide layer runs before response generation and decides whether to continue normally,
  ask at most one grounded follow-up question, encourage reflection, or transition the user
  toward writing today's journal. Follow-ups are anchored to real memory signals — recent
  entries, active projects, important people, frequently mentioned places, and knowledge-
  graph relationships — and never invent details or pile on questions. The guide is used by
  both the assistant panel and the Co-Writer; with no AI provider, the rule-based path still
  appends a short templated follow-up, so Atlas stays helpful offline.

## Pending Milestones
None in the roadmap — all 18 milestones are complete.

## Optional Future Work (out of scope, not planned)
Permanent AI memory, journal summarization, tool calling, cloud providers.

## Known Issues
- `vite build` emits a cosmetic "chunk > 500 kB" advisory (bundle ~615 kB). Not an
  error; build succeeds. Could be addressed later via code-splitting if desired.
- No functional defects or open bugs.
