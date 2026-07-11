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

## Phase 16: Remote Client / Docker Server Deployment ✅

- [x] Dockerfile for server (multi-stage, Alpine, native better-sqlite3 build)
- [x] Server env vars: `PORT`, `HOST`, `DB_PATH`, `UPLOADS_DIR`
- [x] Client runtime server URL config (localStorage-backed `server-config.ts`)
- [x] Dynamic base URL in RTK Query (reads from config on every request)
- [x] Settings modal for server URL configuration (input + test connection)
- [x] Fix upload image URLs to use absolute paths (via `transformResponse` in API slice)
- [x] Settings button (gear icon) in app header
- [x] GitHub Actions workflow: build client → deploy to GitHub Pages
- [x] Documentation in README.md for the deployment model

## Phase 17: Daily Notes / Journal ✅

- [x] "Open Today" button in header + keyboard shortcut (Ctrl+Shift+T)
- [x] Auto-create daily note with `YYYY-MM-DD` title (via `/note/by-date/:date`)
- [x] Journal page (`/journal`) — reverse-chronological timeline grouped by month
- [x] Daily note template with date, day of week, "## Tasks" / "## Notes" structure
- [x] Calendar integration: date click opens daily note via `/note/by-date/:date`
- [x] Streak counter (consecutive days with a daily note) — displayed in Journal header

## Phase 18: Note Version History ✅

- [x] `note_versions` table with content snapshots
- [x] Auto-snapshot on every note save (before update, in `routes/notes.ts`)
- [x] Backend CRUD for versions (list, get, restore in `routes/versions.ts`)
- [x] Version history panel in the note editor (`VersionHistoryPanel.tsx`, integrated into `EditorSidePanel.tsx`)
- [x] Timeline view with timestamps and character diffs
- [x] Unified diff viewer (line-diff between selected versions)
- [x] Restore with confirmation dialog

## Phase 19: Mind Map / Canvas View ✅

- [x] `canvases`, `canvas_items`, `canvas_edges` tables with indexes
- [x] Server CanvasRepository with full CRUD + batch update
- [x] REST API: canvases, items, edges, batch endpoint
- [x] Infinite canvas with CSS transform pan/zoom + mouse-wheel zoom
- [x] Drag-to-position items with resize handles
- [x] Toolbar: select, pan, connect, add text box, add note pin, delete, bring to front, color picker
- [x] Pin existing notes as cards via search-and-select modal
- [x] Connector lines (straight/curved) with SVG rendering
- [x] Auto-save with 1-second debounce via batch update
- [x] Multiple canvases with sidebar list (create/rename/delete)
- [x] Export canvas as PNG (renders items + edges to canvas)
- [x] "Canvas" link in header navigation + `/canvas` route

## Phase 20: Canvas — Image Items ✅

- [x] Add "Add Image" toolbar button alongside Text Box and Note Pin
- [x] Image upload modal reusing existing upload infrastructure (Phase 13): drop zone for new uploads, browse existing uploads gallery
- [x] Render image items on canvas at original aspect ratio with resize handle
- [x] Double-click on image item opens full image in lightbox
- [x] Drag-and-drop image files from desktop onto canvas creates image item
- [x] Paste image from clipboard onto canvas creates image item
- [x] Server: `canvas_items` table already supports `type = 'image'` — no schema change needed
- [x] Client: update `CanvasItem` rendering in `CanvasPage.tsx` for `type === "image"` with `<img>` element
- [x] Deleted image items do not delete underlying upload (uploads are shared media)

## Phase 21: Canvas — Multi-Select & Batch Operations ✅

- [x] Shift-click to toggle items into multi-selection set
- [x] Rubber-band / lasso selection: drag on empty canvas draws selection rectangle, intersecting items become selected
- [x] Selection count badge in toolbar ("3 selected")
- [x] Batch move: drag any selected item moves all selected items by same delta
- [x] Batch delete: removes all selected items + their edges
- [x] Batch color change: color picker applies to all selected items
- [x] Batch bring-to-front: raises all selected items to top preserving relative order
- [x] Batch resize: resize handle on any selected item resizes all
- [x] Click on empty canvas deselects all
- [x] Multi-select state: `selectedItemIds: Set<string>` replaces `selectedItemId: string | null`

## Phase 22: Canvas — Undo/Redo ✅

- [x] In-memory undo/redo stack snapshotting items + edges before each mutation
- [x] Stack entries store `{ items: CanvasItem[]; edges: CanvasEdge[] }` — full state snapshot
- [x] Max stack depth: 100 entries; new action discards redo history (linear undo model)
- [x] Actions that create snapshots: item add/delete, drag (one entry per drag), resize (one entry per resize), text edit (on blur), color change, edge add/delete, bring to front
- [x] Actions that do NOT create snapshots: pan/zoom, text editing in progress
- [x] Keyboard shortcuts: `Ctrl+Z` undo, `Ctrl+Shift+Z` / `Ctrl+Y` redo
- [x] Toolbar undo/redo buttons next to zoom controls (disabled when stack empty)
- [x] Auto-save debounce continues to fire — undoing saves reverted state on next debounce tick
- [x] Entirely client-side, no server changes

## Phase 23: Canvas — Snap-to-Grid & Alignment Guides ✅

- [x] Toggleable grid overlay rendered via CSS radial-gradient background on the transformed canvas layer (scrolls/pans with canvas)
- [x] Configurable grid size: small (20px), medium (40px default), large (80px) via toolbar dropdown
- [x] Grid hidden on export PNG (CSS background, not drawn on export canvas)
- [x] Snap-to-grid on drag: snap top-left corner to nearest grid intersection
- [x] Snap-to-grid on resize: snap width/height to grid increments
- [x] Snap threshold: 50% of grid size (via Math.round)
- [x] Toggleable snap mode with separate toolbar button (magnet icon) from grid visibility
- [x] Smart alignment guides when grid snap is off:
  - [x] Detect when dragged item edges/center align with any other item edges/center
  - [x] Render thin blue guide lines at alignment points (SVG `<line>` inside connectors layer)
  - [x] Alignment tolerance: 5px
  - [x] Supported: top, bottom, left, right edges; vertical + horizontal center
  - [x] Extended dashed lines when 3+ items share an alignment
- [x] Distribution guides: when 3+ items dragged, show green equal-spacing indicators and gap markers
- [x] All guide logic is purely client-side — no server involvement

## Phase 24: Canvas — Auto-Layout ✅

- [x] Auto-Layout dropdown button next to Export with two modes: Force-Directed and Tree
- [x] Force-Directed Layout:
  - [x] Use d3-force simulation (reuse from Phase 8 Graph View) on canvas coordinates
  - [x] Forces: charge (repel, -300), link (attract connected at 150px), center (pull toward item midpoint)
  - [x] ~300 iterations via simulation.tick(); animate x/y over ~500ms with ease-out cubic
  - [x] Auto-save new positions after animation completes
- [x] Tree Layout:
  - [x] Auto-select most-connected item as root
  - [x] Top-down arrangement with levelSpacing 150px, siblingSpacing 200px
  - [x] Levels via BFS shortest path from root; siblings evenly spaced and centered
  - [x] Graceful cycle handling (visited set ignores back-edges)
  - [x] Handles disconnected items (placed at level 0)
- [x] Progress spinner (SVG spinning circle) shown in the Layout button while computation is active
- [x] All changes go through existing auto-save mechanism — no new server endpoints
- [x] Outside-click closes the layout dropdown

## Phase 25: DataView / Query Engine ⬜

- [ ] TipTap extension rendering `dataview` code blocks as live tables/lists
- [ ] Query DSL: `LIST`, `TABLE`, sources (`#tag`, `"folder"`), conditions, sorting
- [ ] Backend endpoint: `POST /api/dataview/query`
- [ ] Result caching with cache-busting
- [ ] Auto-refresh and manual refresh button
- [ ] Code block language picker includes `dataview`

## Phase 26: Reminders & Alerts ⬜

- [ ] `reminders` table with note_id, remind_at, done flag
- [ ] Backend CRUD for reminders
- [ ] Server periodic check (30s interval) for due reminders
- [ ] Client polling with Browser Notification API + in-app toasts
- [ ] Snooze and dismiss actions
- [ ] Reminder picker UI in note editor (datetime picker)
- [ ] Calendar integration: reminder indicators on calendar days

## Phase 27: Testing & Hardening (New Features) ⬜

- [ ] Unit tests for all new repositories and API handlers
- [ ] Component tests for CalendarPage, DailyJournal, VersionHistoryPanel, CanvasView, DataView, ReminderPicker
- [ ] E2E: calendar workflow, version restore, canvas create/edit/export, dataview rendering
- [ ] Edge cases: ICS URL unreachable/malformed, large canvas performance, version storage limits, timezone handling

## Phase 28: Templates (Notes + Projects) ✅

### Data Model
- [x] `templates` table: id, type (note|project), name, description, content (JSON), timestamps
- [x] Note template content schema: title, body (TipTap JSON), tags, folder
- [x] Project template content schema: groups with columns (name, color) + predefined artifacts

### Backend
- [x] TemplateRepository with full CRUD prepared statements
- [x] `GET /api/templates?type=note|project` — list templates
- [x] `POST /api/templates` — create template
- [x] `GET /api/templates/:id` — get detail
- [x] `PUT /api/templates/:id` — update
- [x] `DELETE /api/templates/:id` — delete
- [x] `POST /api/templates/:id/apply?target=note` — instantiate as new note (replace variables, set tags/folder)
- [x] `POST /api/templates/:id/apply?target=project` — create project + groups + columns + artifacts from template
- [x] Built-in template seeding (migration or on-startup)

### Frontend
- [x] `TemplatesPage` at `/templates` — template grid grouped by type, CRUD actions
- [x] `TemplateCard` component — name, description, type badge, apply/edit/delete
- [x] `TemplateEditorModal` — create/edit note or project templates (dynamic form for project structure)
- [x] `TemplatePickerModal` — reusable picker shown on new-note / new-project creation (Blank vs From template tabs)
- [x] Note editor — "Save as template" action button
- [x] ProjectOverviewPage — "Save Project as Template" button
- [x] ProjectsPage + NoteListPage — "From Template" buttons that invoke picker
- [x] Template variables: `{{date}}`, `{{title}}`, `{{today}}`, `{{project_name}}`, `{{group_name}}`
- [x] Client types + RTK Query endpoints for templates
- [ ] Tests for repository, API handlers, and components

## Phase 29: Export / Import ⬜

- [ ] Export single note as Markdown
- [ ] Export all notes as ZIP of `.md` files
- [ ] Import from Markdown files
- [ ] Obsidian vault import (folder structure, wikilinks, tags)
- [ ] Export as PDF (browser print)

## Phase 30: Code Syntax Highlighting ✅

- [x] Add highlight.js via lowlight + `@tiptap/extension-code-block-lowlight`
- [x] TipTap extension (`CodeBlockHighlight`) with lowlight highlighting, extending `CodeBlockLowlight`
- [x] Language selector dropdown in the formatting toolbar (shown when code block is active)
- [x] Copy-to-clipboard button on each code block (via ProseMirror decoration plugin, with hover visibility)

## Phase 31: Infinite Scalability (Pagination + SQL Pushdown) ✅

- [x] Add database indexes for sort/filter columns
- [x] Add pagination types and utilities (PageRequest, PageResponse)
- [x] Refactor NoteRepository with SQL pushdown and pagination
- [x] Refactor TagRepository — add getNotesForTag (single JOIN query)
- [x] Refactor LinkRepository — targeted methods (backlinkNotes, getLinksForNote)
- [x] Update GET /api/notes with limit/offset/sort server-side
- [x] Update GET /api/search with pagination + SQL LIMIT
- [x] Update GET /api/tags/:name/notes with pagination
- [x] Update GET /api/notes/:id/backlinks with pagination
- [x] Update GET /api/notes/:id/unlinked-mentions with pagination
- [x] Update GET /api/graph with capped nodes
- [x] Update GET /api/graph/:id to use getLinksForNote (avoid loading all links)
- [x] Update GET /api/folders to use GROUP BY
- [x] Fix syncNoteRelations/enrichNote helpers
- [x] Add PageResponse types to client
- [x] Update RTK Query API endpoints
- [ ] ~~Create useInfiniteScroll hook~~ (components handle pagination inline)
- [x] Update Sidebar — remove allNotes dependency
- [x] Update FolderTree for lazy per-folder loading
- [x] Update NoteListPage with paginated load-more
- [x] Update TagsPage with pagination
- [x] Update SearchPage with paginated results
- [x] Update GraphPage with capped graph + load more
- [x] Update CommandPalette to use suggest endpoint
- [x] Update BacklinksPanel with pagination
- [x] Verify type checks (server + client) and tests (37 server + 4 client)

## Phase 32: Projects (Kanban Boards & Artifact Registry) ✅

- [x] DB schema: projects, project_groups, project_columns, project_cards, project_artifacts
- [x] ProjectRepository with full CRUD + prepared statements
- [x] REST API endpoints (groups, columns, cards, artifacts)
- [x] Client types + RTK Query endpoints with Project/ProjectList tags
- [x] Shared useMouseDrag hook (canvas + kanban)
- [x] ProjectsPage — project list grid
- [x] ProjectOverviewPage — groups list + global artifacts
- [x] ProjectGroupPage — kanban board + group artifacts (tabs)
- [x] KanbanColumn, KanbanCard, CardEditor components
- [x] ArtifactCard, ArtifactPickerModal components
- [x] Drag-and-drop: cards between columns, column reorder
- [x] Navigation links + routes in App.tsx
- [ ] Tests for repositories, API handlers, and components

## Phase 33: Architecture Diagramming ✅

- [x] Schema migration: ALTER canvas_edges for label, style, arrow columns
- [x] CanvasRepository + routes updated for new edge fields
- [x] New shape types: rectangle, rounded_rectangle, circle, diamond, cylinder, cloud, hexagon
- [x] Shape palette toolbar (click shape → place on canvas)
- [x] Shape rendering (SVG per type with centered label)
- [x] Edge labels, arrowheads (start/end), dashed/dotted styles
- [x] Connection ports (edges snap to shape edge midpoints)
- [x] SVG export alongside existing PNG export
- [x] "New Diagram" template preset (grid, snap, shape palette)
- [ ] Tests

## Phase 34: Bug Fixes & UI Improvements ⬜

### Templates — Critical Fixes
- [ ] TemplatePickerModal defaults to "blank" tab instead of "template"
- [ ] Blank tab has a "Create Blank" button instead of "close to proceed"
- [ ] `handleApply` in TemplatesPage navigates to created note/project
- [ ] Template variable replacement doesn't corrupt TipTap JSON (replace in title only, or walk node tree)
- [ ] Template tag creation uses TagRepository instead of raw SQL
- [ ] Project template preserves column colors when saving
- [ ] TemplateEditorModal has structured UI for project templates (groups/columns/artifacts form)

### Projects — Critical Fixes
- [ ] Kanban card drag-and-drop between columns works (fix DnD system mismatch)
- [ ] ArtifactPickerModal search stores and displays results
- [ ] Artifact count display shows proper formatting ("2 global, 3 in groups")
- [ ] Project delete uses `.unwrap()` with error toast
- [ ] Project context menu closes on outside click

### Canvas & Architecture Diagramming — Critical Fixes
- [ ] `scheduleAutoSave` includes edge label, edgeStyle, arrowStart, arrowEnd
- [ ] SVG export includes edge labels, arrowheads, and dashed/dotted styles
- [ ] PNG export renders shapes as actual geometry (not just rectangles)
- [ ] "New Diagram" sets grid/snap state before or during navigation
- [ ] Edge property editing UI (floating panel for label, style, arrows)

### UI Polish
- [ ] Loading states for template operations
- [ ] Confirmation dialog for template deletion
- [ ] Keyboard navigation in TemplatePickerModal and ArtifactPickerModal
- [ ] Mobile-responsive layout for ProjectsPage and CanvasPage toolbar

## Phase 35: Project Management Enhancements ⬜

- [ ] Card Labels/Tags (project_labels + project_card_labels tables, label picker, filter)
- [ ] Card Checklists (project_card_checklists table, checklist UI in CardEditor, progress bar)
- [ ] Card Comments/Activity Log (project_card_comments table, comment list, activity feed)
- [ ] Project Timeline/Gantt View (/project/:id/timeline route, bar chart, drag dates)
- [ ] Milestone Markers (project_milestones table, milestone list, timeline markers)
- [ ] Card Filtering & Search (filter bar in ProjectGroupPage, search across groups)
- [ ] Bulk Card Operations (multi-select, batch move/archive/delete/label)
- [ ] Card Sorting (sort dropdown in KanbanColumn header)
- [ ] Project Analytics Dashboard (/project/:id/analytics route, charts)
- [ ] Card Templates (project_card_templates table, template picker in CardEditor)

## Phase 36: Architecture Canvas Enhancements ⬜

- [ ] Edge Property Editor (floating panel for label, style, arrows on edge select)
- [ ] Shape Connection Port Visualization (N/S/E/W port dots on hover)
- [ ] Shape Grouping (group/ungroup, move/resize as unit)
- [ ] Stencil Library (pre-built diagram templates: AWS, ERD, C4, network)
- [ ] Mini-map (overview minimap in corner, viewport rectangle, click to navigate)
- [ ] Shape Text Styling (font size, bold/italic controls for shape labels)
- [ ] Export to Mermaid (generate Mermaid syntax from canvas)
- [ ] Shape Resize Constraints (lock aspect ratio, min/max sizes)
- [ ] Canvas Versioning (named snapshots, version list, restore)
- [ ] Keyboard-driven Shape Placement (arrow keys to nudge, Tab to cycle)

