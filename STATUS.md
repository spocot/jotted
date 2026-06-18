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

## Phase 9: Full-Text Search ✅

- [x] Global search bar with typeahead (`SearchBar.tsx` in Layout header)
- [x] Search results page with highlighted snippets (`SearchPage.tsx` — snippet extraction + `<mark>` highlighting)
- [x] Filters: tag (chip filter), sort (relevance/updated/created/title), order toggle
- [x] Keyboard shortcut: `Ctrl+Shift+F` (global listener in Layout)

## Phase 10: Polish & UX ✅

- [x] Dark mode (Tailwind `dark:` — toggle in header, persisted via useUIStore)
- [x] Keyboard shortcuts (Ctrl+Shift+F → Search, Ctrl+P → Command Palette)
- [x] Note preview popover on wikilink hover (`NotePreviewPopover.tsx` — fetches note by title, shows snippet)
- [x] Resizable sidebar (drag handle with min/max bounds, state in useUIStore)
- [x] Loading skeletons (`Skeleton.tsx` — NoteListSkeleton, EditorSkeleton for NoteList/Editor/Search/Graph)
- [x] Command palette (`CommandPalette.tsx` — Ctrl+P, searches notes + actions, keyboard navigable)

## Phase 11: Testing & Hardening ✅

- [x] Unit tests: parser, repositories, API handlers (37 tests) — vitest + supertest
- [x] Component tests: ToastContainer (4 tests) — vitest + React Testing Library + happy-dom
- [x] Test infrastructure: vitest configs, `npm run test` scripts, test setup files
- [x] Edge cases: empty content, special characters, backlinks, FTS search, 404/400 errors

## Phase 12: Folder Organization & File System Navigation ✅

- [x] Backend endpoint: `GET /api/folders` — hierarchical folder listing with note counts
- [x] Tree component in the sidebar with expand/collapse (`FolderTree.tsx`)
- [x] Create/rename/delete folders from sidebar (inline rename + delete buttons, add-folder form)
- [x] Breadcrumb in the editor showing note path
- [x] Filter notes by folder in the note list (via `activeFolder` state)

## Phase 13: Image & File Attachments ✅

- [x] Server upload endpoint (`POST /api/upload` via multer, 10 MB limit, image-only filter) + static serving at `/uploads`
- [x] Uploads DB table (`uploads`) with note_id, filename, mime_type, size
- [x] TipTap Image extension configured for inline rendering
- [x] Drag-and-drop + paste handler for images (`handleDOMEvents.drop` + `.paste` in editorProps)
- [x] AttachmentsPanel component with image grid, thumbnail preview, upload/delete, drag-drop zone
- [x] Client API methods: `uploadFile`, `getUploads`, `deleteUpload`
- [x] Vite proxy for `/uploads` → `localhost:3000`

## Phase 14: Calendar Page & ICS Calendar Sync ✅

- [x] Calendar grid component with month/week/day views
- [x] Backend endpoint: `GET /api/calendar` — notes bucketed by day
- [x] Hover tooltips with created/modified note lists per day
- [x] Visual indicators (dots/icons) on days with note activity
- [x] ICS URL fetcher — fetches and parses iCalendar files from remote URLs
- [x] Periodic background sync (configurable interval, default 15 min)
- [x] Settings UI to add/remove ICS URLs
- [x] Merge ICS events into calendar view alongside note activity
- [x] Graceful error handling when a sync fails (note-only fallback, error indicator)

## Phase 15: Redux & RTK Query Migration ✅

- [x] Install `@reduxjs/toolkit` and `react-redux`
- [x] Create Redux store (`store.ts`, `hooks.ts`) with `configureStore`
- [x] Create RTK Query API slice with `createApi` + `fetchBaseQuery` and full endpoint set
- [x] Define cache tag system: `Note`, `NoteList`, `Tag`, `TagList`, `Folder`, `Upload`, `Calendar`
- [x] Implement all query endpoints (GET) with `providesTags`
- [x] Implement all mutation endpoints (POST/PUT/DELETE) with `invalidatesTags`
- [x] Migrate `useNoteStore` → auto-generated query/mutation hooks
- [x] Migrate `useTagStore` → auto-generated query/mutation hooks
- [x] Keep `useToastStore` and `useUIStore` as Zustand (client-side only)
- [x] Wrap app in `<Provider store={store}>` in `main.tsx`
- [x] Remove `api/client.ts` and all direct API call imports
- [x] Remove manual race-condition guard (`selectVersion`), handled by RTK Query
- [x] Update test files for new store architecture
- [x] Run full type check (`tsc --noEmit`) and test suite (`vitest run`)

## Phase 16: Remote Client / Docker Server Deployment ⬜

- [ ] Dockerfile for server (multi-stage, Alpine, native better-sqlite3 build)
- [ ] Server env vars: `PORT`, `HOST`, `DB_PATH`, `UPLOADS_DIR`
- [ ] Client runtime server URL config (localStorage-backed `server-config.ts`)
- [ ] Dynamic base URL in RTK Query (reads from config on every request)
- [ ] Settings modal for server URL configuration (input + test connection)
- [ ] Fix upload image URLs to use absolute paths
- [ ] Settings button in app header
- [ ] GitHub Actions workflow: build client → deploy to GitHub Pages
- [ ] Documentation in README.md for the deployment model

## Phase 17: Daily Notes / Journal ⬜

- [ ] "Open Today" button + keyboard shortcut
- [ ] Auto-create daily note with `YYYY-MM-DD` title
- [ ] Journal page (`/journal`) — reverse-chronological timeline
- [ ] Daily note template with date/day/tasks structure
- [ ] Calendar integration: date click opens daily note
- [ ] Streak counter (consecutive days with a daily note)

## Phase 18: Note Version History ⬜

- [ ] `note_versions` table with content snapshots
- [ ] Auto-snapshot on every note save
- [ ] Backend CRUD for versions (list, get, restore)
- [ ] Version history panel in the note editor
- [ ] Timeline view with timestamps and character diffs
- [ ] Side-by-side or unified diff viewer
- [ ] Restore with confirmation dialog

## Phase 19: Mind Map / Canvas View ⬜

- [ ] `canvases` and `canvas_items` tables
- [ ] Infinite canvas with drag-to-position items
- [ ] Toolbar: text box, note pin, connector, delete, color picker
- [ ] Pin existing notes as cards with title + snippet
- [ ] Connector lines between items (straight/curved)
- [ ] Auto-save canvas state as JSON
- [ ] Multiple canvases with sidebar list
- [ ] Export canvas as PNG/SVG

## Phase 20: DataView / Query Engine ⬜

- [ ] TipTap extension rendering `dataview` code blocks as live tables/lists
- [ ] Query DSL: `LIST`, `TABLE`, sources (`#tag`, `"folder"`), conditions, sorting
- [ ] Backend endpoint: `POST /api/dataview/query`
- [ ] Result caching with cache-busting
- [ ] Auto-refresh and manual refresh button
- [ ] Code block language picker includes `dataview`

## Phase 21: Reminders & Alerts ⬜

- [ ] `reminders` table with note_id, remind_at, done flag
- [ ] Backend CRUD for reminders
- [ ] Server periodic check (30s interval) for due reminders
- [ ] Client polling with Browser Notification API + in-app toasts
- [ ] Snooze and dismiss actions
- [ ] Reminder picker UI in note editor (datetime picker)
- [ ] Calendar integration: reminder indicators on calendar days

## Phase 22: Testing & Hardening (New Features) ⬜

- [ ] Unit tests for all new repositories and API handlers
- [ ] Component tests for CalendarPage, DailyJournal, VersionHistoryPanel, CanvasView, DataView, ReminderPicker
- [ ] E2E: calendar workflow, version restore, canvas create/edit/export, dataview rendering
- [ ] Edge cases: ICS URL unreachable/malformed, large canvas performance, version storage limits, timezone handling

## Phase 23: Note Templates ⬜

- [ ] Server CRUD for templates
- [ ] Template picker on new-note creation
- [ ] Built-in defaults (Daily Note, Meeting Notes, To-Do)
- [ ] "Save as template" action from editor
- [ ] Template variables: `{{date}}`, `{{title}}`

## Phase 24: Export / Import ⬜

- [ ] Export single note as Markdown
- [ ] Export all notes as ZIP of `.md` files
- [ ] Import from Markdown files
- [ ] Obsidian vault import (folder structure, wikilinks, tags)
- [ ] Export as PDF (browser print)

## Phase 25: Code Syntax Highlighting ⬜

- [ ] Add highlight.js or Shiki
- [ ] TipTap extension for code block highlighting
- [ ] Language selector
- [ ] Copy-to-clipboard button

