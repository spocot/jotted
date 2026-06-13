# Jotted — Implementation Status

## Legend

- ✅ Complete
- 🔄 In progress
- ⬜ Not started

---

## Phase 1: Project Scaffolding ✅

- [x] Init root `package.json` with npm workspaces
- [x] `packages/client`: Vite + React + TypeScript + Tailwind CSS + Zustand + React Router
- [x] `packages/server`: Express + TypeScript + `tsx` + `better-sqlite3`
- [x] Shared `tsconfig.base.json`, root dev script with `concurrently`
- [x] `better-sqlite3` cross-platform build config
- [x] Vite proxy `/api` → `localhost:3000`
- [x] Verify `npm run dev` starts both client and server

## Phase 2: Database Layer & Content Parser ✅

- [x] SQL schema: `notes`, `tags`, `note_tags`, `links`, `notes_fts` (FTS5)
- [x] Repository pattern classes (`NoteRepository`, `TagRepository`, `LinkRepository`)
- [x] Wikilink parser: `[[wikilink]]` in `parser/wikilink-parser.ts`
- [x] Tag parser: `#tag` → upsert into `note_tags` in `parser/tag-parser.ts`
- [x] FTS index rebuilt on note save (via transaction in NoteRepository)
- [x] Raw `better-sqlite3` prepared statements (no ORM)

## Phase 3: Backend API ✅

- [x] Express router per domain (`routes/notes.ts`, `routes/tags.ts`, `routes/search.ts`, `routes/graph.ts`)
- [x] All 12 API endpoints from PLAN.md implemented
- [x] Validation (`BadRequest`/`NotFound` errors), centralized error middleware, CORS

## Phase 4: Frontend Foundation & Note CRUD ✅

- [x] React Router: `/`, `/note/:id`, `/search`, `/graph`, `/tags`
- [x] Zustand stores: `useNotesStore`, `useUIStore`, `useTagStore`
- [x] API client module
- [x] Sidebar: note list, folder tree, create/delete
- [x] Note editor page with auto-save
- [x] Textarea-based editing (placeholder until TipTap)

## Phase 5: Rich Text Editor (TipTap) ✅

- [x] TipTap + React wrapper
- [x] Core extensions: headings, bold, italic, lists, code, blockquote, tasks
- [x] Custom `Wikilink` extension: inline link rendering
- [x] Custom `Tag` extension: chip rendering
- [x] TipTap JSON ↔ Markdown sync (via prosemirror-markdown serializer + marked)
- [x] Debounced auto-save (500ms)
- [x] Formatting toolbar: bold, italic, strike, code, headings, lists, blockquote, code block

## Phase 6: Tagging System UI ✅

- [x] Tag chips inline in editor (add/remove via interactive chips + input field)
- [x] Tag filter pane in sidebar (clickable tags filter the note list)
- [x] Click tag to filter note list (sidebar + TagsPage)
- [x] Tag management: rename, delete, view notes (TagsPage with inline rename + delete buttons)

## Phase 7: Backlinks & Note Connections ✅

- [x] Backlinks panel in note editor (BacklinksPanel component, displayed below editor)
- [x] Unlinked mentions detection (`GET /api/notes/:id/unlinked-mentions` endpoint)
- [x] Visual indicator for notes with backlinks (blue dot in sidebar + linked references section)

## Phase 8: Graph View ✅

- [x] D3.js force-directed graph (`GraphView.tsx`)
- [x] Global graph + per-note subgraph (`/graph` with `?note=` param + `SubgraphView.tsx` in editor)
- [x] Zoom, pan, drag, click-to-navigate (d3.zoom + d3.drag + navigate on click)
- [x] Tag-based filtering (tag chips in GraphPage filter nodes + color-by-tag)

## Phase 9: Full-Text Search ⬜

- [ ] Global search bar with typeahead
- [ ] Search results page with highlighted snippets
- [ ] Filters: tag, folder, date, sort order
- [ ] Keyboard shortcut: `Ctrl+Shift+F`

## Phase 10: Polish & UX ⬜

- [ ] Dark mode (Tailwind `dark:`)
- [ ] Keyboard shortcuts
- [ ] Note preview popover on wikilink hover
- [ ] Resizable sidebar
- [ ] Loading skeletons, empty states, toasts
- [ ] Command palette (`Ctrl+P`)

## Phase 11: Testing & Hardening ⬜

- [ ] Unit tests: parser, repositories, API handlers (vitest)
- [ ] Component tests: Sidebar, NoteEditor, SearchBar, GraphView (RTL)
- [ ] E2E: Playwright critical paths
- [ ] Edge cases: cycles, special characters, 10k benchmark
