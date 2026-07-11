# Jotted — Implementation Plan

An Obsidian-like note-taking web application with React frontend and SQLite backend.

## Architecture

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast dev/build, modern React |
| Backend | Express.js + TypeScript | Lightweight, easy REST API |
| Database | SQLite via `better-sqlite3` | Synchronous, fast, FTS5, cross-platform |
| Rich Text | TipTap (ProseMirror) | Extensible, React-native, Markdown support |
| Graph | D3.js force-directed layout | Full control, interactive |
| State | Zustand | Minimal boilerplate, TypeScript-native |
| Styling | Tailwind CSS | Utility-first, rapid UI development |
| Monorepo | npm workspaces | Simple, no extra tooling |

**Desktop:** Not in scope (web-only MVP).

---

## Database Schema

| Table | Purpose |
|---|---|
| `notes` | Core notes: id, title, content, path, created_at, updated_at |
| `tags` | Unique tag names |
| `note_tags` | Many-to-many junction |
| `links` | Source→target note references (from `[[wikilinks]]`) |
| `notes_fts` | FTS5 virtual table on title + content for full-text search |

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/notes` | List notes (filter by folder, tag) |
| POST | `/api/notes` | Create note |
| GET | `/api/notes/:id` | Note detail (links, tags, backlinks) |
| PUT | `/api/notes/:id` | Update content → re-parse → update FTS |
| DELETE | `/api/notes/:id` | Delete note + clean up |
| GET | `/api/search?q=` | FTS5 full-text search |
| GET | `/api/search/suggest?q=` | Fast typeahead (title) |
| GET | `/api/tags` | All tags with note counts |
| GET | `/api/tags/:name/notes` | Notes for a tag |
| GET | `/api/graph` | All nodes + edges for global graph |
| GET | `/api/graph/:id` | Subgraph centered on a note |
| GET | `/api/notes/:id/backlinks` | Notes linking to a note |

---

## Monorepo Structure

```
jotted/
├── packages/
│   ├── client/              # React frontend (Vite)
│   │   ├── src/
│   │   │   ├── components/  # Editor, Sidebar, Graph, Search, etc.
│   │   │   ├── pages/       # Route pages
│   │   │   ├── store/       # Zustand stores
│   │   │   ├── hooks/       # Custom hooks
│   │   │   ├── api/         # API client
│   │   │   └── types/       # Shared types
│   │   ├── index.html
│   │   └── vite.config.ts
│   └── server/              # Express backend
│       ├── src/
│       │   ├── routes/      # notes, tags, search, graph
│       │   ├── db/          # schema, migrations, queries
│       │   ├── parser/      # [[wikilink]] and #tag parser
│       │   └── index.ts     # Express entry
│       └── package.json
├── package.json              # Root workspace
└── tsconfig.base.json
```

---

## Implementation Phases

### Phase 1: Project Scaffolding

- Init root `package.json` with npm workspaces
- `packages/client`: Vite + React + TypeScript + Tailwind CSS + Zustand + React Router
- `packages/server`: Express + TypeScript + `tsx` + `better-sqlite3`
- Shared `tsconfig.base.json`, root dev script with `concurrently`
- `better-sqlite3` cross-platform build config
- Vite proxy `/api` → `localhost:3000`
- Verify `npm run dev` starts both client and server

### Phase 2: Database Layer & Content Parser

- SQL schema: `notes`, `tags`, `note_tags`, `links`, `notes_fts` (FTS5)
- Repository pattern classes
- Wikilink parser: `\[\[([^\]]+)\]\]` → resolve to note IDs
- Tag parser: `#tag` → upsert into `note_tags`
- FTS index rebuilt on note save
- Raw `better-sqlite3` prepared statements (no ORM)

### Phase 3: Backend API

- Express router per domain
- All endpoints from API table above
- Validation, error handling middleware, CORS

### Phase 4: Frontend Foundation & Note CRUD

- React Router: `/`, `/note/:id`, `/search`, `/graph`, `/tags`
- Zustand stores: `useNotesStore`, `useUIStore`, `useTagStore`
- API client module
- Sidebar: note list, folder tree, create/delete
- Note editor page with auto-save
- Textarea-based editing (placeholder until TipTap)

### Phase 5: Rich Text Editor (TipTap)

- TipTap + React wrapper
- Core extensions: headings, bold, italic, lists, code, blockquote, tasks
- Custom `Wikilink` extension: inline link + autocomplete
- Custom `Tag` extension: chip + autocomplete
- TipTap JSON ↔ Markdown sync
- Debounced auto-save (500ms)

### Phase 6: Tagging System UI

- Tag chips inline in editor
- Tag filter pane in sidebar
- Click tag to filter note list
- Tag management: rename, delete, view notes

### Phase 7: Backlinks & Note Connections

- Backlinks panel in note editor
- Unlinked mentions detection
- Visual indicator for notes with backlinks

### Phase 8: Graph View

- D3.js force-directed graph
- Global graph + per-note subgraph
- Zoom, pan, drag, click-to-navigate
- Tag-based filtering

### Phase 9: Full-Text Search

- Global search bar with typeahead
- Search results page with highlighted snippets
- Filters: tag, folder, date, sort order
- Keyboard shortcut: `Ctrl+Shift+F`

### Phase 10: Polish & UX

- Dark mode (Tailwind `dark:`)
- Keyboard shortcuts
- Note preview popover on wikilink hover
- Resizable sidebar
- Loading skeletons, empty states, toasts
- Command palette (`Ctrl+P`)

### Phase 11: Testing & Hardening

- Unit tests: parser, repositories, API handlers (vitest)
- Component tests: Sidebar, NoteEditor, SearchBar, GraphView (RTL)
- E2E: Playwright critical paths
- Edge cases: cycles, special characters, 10k benchmark

### Phase 12: Folder Organization & File System Navigation

- Backend endpoint: `GET /api/folders` — hierarchical folder listing with note counts
- Tree component in the sidebar with expand/collapse
- Drag notes between folders
- Create/rename/delete folders from sidebar
- Breadcrumb in the editor showing note path
- Filter notes by folder in the note list

### Phase 13: Image & File Attachments

- Server upload endpoint + static serving
- TipTap Image extension rendering uploaded images
- Drag-and-drop + paste handler for images
- Inline image resizing
- File attachment list / gallery view

### Phase 14: Calendar Page & ICS Calendar Sync

- New route `/calendar` with a month-view calendar grid
- Backend endpoint `GET /api/calendar` — returns notes bucketed by day (created + modified counts, note IDs per date)
- Hover tooltip on each day shows lists of notes created and modified on that date, with links to open them
- Visual indicators (dots/icons) on days that have note activity
- Toggle between created, modified, or combined view
- ICS calendar sync:
  - Backend fetches and parses ICS files from configured URLs at regular intervals
  - Events merged into calendar view alongside note activity
  - Settings UI to add/remove ICS URLs (supports CalDAV publish URLs, public calendars, etc.)
  - Periodic background refresh (configurable interval, default 15 minutes)
  - Graceful fallback if sync fails (note-only mode with sync error indicator)
- Calendar date click opens / creates a Daily Note for that day (ties into Phase 16)

### Phase 15: Redux & RTK Query Migration

- Install `@reduxjs/toolkit` and `react-redux` dependencies
- Create Redux store foundation:
  - `src/store/redux/store.ts` — `configureStore` with reducer map
  - `src/store/redux/hooks.ts` — typed `useAppSelector` and `useAppDispatch` exports
- Create RTK Query API slice (`src/store/redux/api.ts`) with `createApi` + `fetchBaseQuery`:
  - Base query configured for `/api` prefix with JSON `Content-Type` header
  - **Cache tag system** for automatic invalidation:
    - `"Note"` (per-id) and `"NoteList"` for notes
    - `"Tag"` (per-id) and `"TagList"` for tags
    - `"Folder"` for folder tree
    - `"Upload"` (per-note-id) for uploads
    - `"Calendar"` for calendar data
  - **Query endpoints** (all GET → `query` with `providesTags`):
    - Notes: `getNotes`, `getNote`, `getNoteBacklinks`, `getNoteUnlinkedMentions`, `getNoteByTitle`, `getBacklinkCounts`
    - Search: `searchNotes`, `searchSuggest`
    - Tags: `getTags`, `getTagNotes`
    - Graph: `getGraph`, `getGraphSub`
    - Folders: `getFolders`
    - Uploads: `getUploads`
    - Calendar: `getCalendarData`, `getOutlookEvents`, `getOutlookStatus`
  - **Mutation endpoints** (POST/PUT/DELETE → `mutation` with `invalidatesTags`):
    - `createNote` → invalidates `"NoteList"`
    - `updateNote` → invalidates [`"NoteList"`, `{type: "Note", id}`]
    - `deleteNote` → invalidates [`"NoteList"`, `{type: "Note", id}`]
    - `addNoteTag`, `removeNoteTag` → invalidates `{type: "Note", id: noteId}`
    - `renameTag`, `deleteTag` → invalidates [`"TagList"`, `"NoteList"`]
    - `renameFolder`, `deleteFolder` → invalidates `"Folder"`
    - `uploadFile` → invalidates `{type: "Upload", id: noteId}`
    - `deleteUpload` → invalidates `"Upload"`
    - `configureOutlookIcsUrl`, `clearOutlookConfig` → invalidates `"Calendar"`
- Migrate Zustand stores to RTK Query hooks:
  - `useNoteStore` → removed; components use `useGetNotesQuery`, `useGetNoteQuery`, and mutation hooks (`useCreateNoteMutation`, `useUpdateNoteMutation`, `useDeleteNoteMutation`)
  - `useTagStore` → removed; components use `useGetTagsQuery`, `useRenameTagMutation`, `useDeleteTagMutation`
  - Keep `useToastStore` and `useUIStore` as-is (purely client-side, no API dependency)
  - Remove manual race-condition guard (`selectVersion` counter) — RTK Query handles stale responses via tag lifecycle
- Wrap app in `<Provider store={store}>` in `main.tsx`
- Remove `packages/client/src/api/client.ts` — all call sites migrated to auto-generated hooks
- Update test files: migrate store-dependent tests to use `setupApiStore` test helper or mock RTK Query hooks
- Run `npx -w packages/client tsc --noEmit` and `npm run test -w packages/client` to verify no regressions

### Phase 16: Remote Client / Docker Server Deployment

- Deploy client as a static SPA on GitHub Pages (or any static host)
- Package server as a Docker container for users to run locally
- Runtime-configurable server URL in the client (settings UI + localStorage)
- Dynamic base URL in RTK Query so API calls go to the user's local server
- Fix upload image URLs to use absolute paths (prefixed with configured server URL)
- Server reads PORT/HOST/DB_PATH/UPLOADS_DIR from environment variables
- GitHub Actions workflow to build client and deploy to GitHub Pages on push to main
- CORS: server's existing `app.use(cors())` already allows all origins, no change needed
- Mixed-content note: GitHub Pages serves HTTPS, but modern browsers allow `http://localhost` from HTTPS pages as a special case

### Phase 17: Daily Notes / Journal

- "Open Today" button in the header and keyboard shortcut — opens or creates a note with title `YYYY-MM-DD`
- Journal page at `/journal` — a reverse-chronological timeline of daily notes
- Automatic daily note creation on first open of the day (configurable)
- Daily note template: pre-populates with date, day of week, and a "## Tasks" / "## Notes" structure
- Calendar integration: clicking a date on the calendar opens the daily note for that day
- Streak counter (consecutive days with a daily note)

### Phase 18: Note Version History

- New `note_versions` table: `id, note_id, content, title, created_at` — stores a snapshot on each save
- Server-side: on every note update, insert a version row (cheap — text snapshots)
- Backend endpoint: `GET /api/notes/:id/versions` — list versions with timestamps
- Backend endpoint: `GET /api/notes/:id/versions/:versionId` — get full snapshot content
- Backend endpoint: `POST /api/notes/:id/versions/:versionId/restore` — restore a version
- "Version History" panel in the note editor (toggleable sidebar/tab)
- Timeline view showing versions with formatted timestamps and character-count diffs
- Side-by-side or unified diff view between selected versions
- "Restore" button with confirmation dialog

### Phase 19: Mind Map / Canvas View

- New route `/canvas` with a free-form infinite canvas
- New `canvases` table: `id, title, data (JSON)`, and `canvas_items` table: `id, canvas_id, note_id (nullable), x, y, width, height, color, text, type`
- Canvas data model: items are nodes (note cards, text boxes, images) positioned absolutely; edges are connectors between items
- Drag to position items; resize handles on selection
- Toolbar: add text box, add note pin, draw connector, delete, color picker
- Pin existing notes into the canvas — displays note title + snippet, click to open
- Connector lines (straight or curved) between items, draggable endpoints
- Auto-save canvas state as JSON to the server on changes
- Multiple canvases with a sidebar list to switch between them
- Export canvas as PNG/SVG

### Phase 20: Canvas — Image Items

- Add "Add Image" toolbar button alongside Text Box and Note Pin
- Image upload modal reusing the existing upload infrastructure (Phase 13):
  - Drop zone or file picker for new uploads
  - Browse existing uploads from the gallery
  - Filter uploads by note association or show all
- Render image items on the canvas:
  - Display image at original aspect ratio with the upload URL as `<img>` source
  - Maintain `width`/`height` from the item (defaults to the image's natural dimensions)
  - Resize handle works the same as text items (maintains aspect ratio optionally)
- Double-click on an image item opens the full image in a lightbox
- Drag-and-drop an image file from the desktop onto the canvas creates a new image item
- Paste an image from the clipboard onto the canvas creates a new image item
- Server: the `canvas_items` table already supports `type = 'image'` — no schema change needed
- Client: update `CanvasItem` rendering in `CanvasPage.tsx` to handle `type === "image"` with an `<img>` element instead of text
- Deleted image items do not delete the underlying upload (uploads are shared media)

### Phase 21: Canvas — Multi-Select & Batch Operations

- Shift-click to toggle items into a multi-selection set
- Rubber-band / lasso selection:
  - Drag on empty canvas space draws a blue selection rectangle
  - Any item intersecting the rectangle becomes selected
  - Works in "Select" tool mode only
- Visual treatment:
  - Selected items show ring highlight (existing single-select ring)
  - Multi-selected items show the same ring; a selection count badge appears in the toolbar ("3 selected")
- Batch operations (apply to all selected items):
  - **Move** — drag any selected item moves all selected items by the same delta
  - **Delete** — toolbar delete button removes all selected items + their edges
  - **Color change** — color picker applies to all selected items
  - **Bring to front** — raises all selected items to the top (preserving relative order)
  - **Resize** — resize handle on any selected item resizes all proportionally (optional stretch vs maintain individual sizes)
- Click on empty canvas deselects all
- `scheduleAutoSave` already handles arrays — save all changed items in one batch call
- Multi-select state: `selectedItemIds: Set<string>` replaces `selectedItemId: string | null`

### Phase 22: Canvas — Undo/Redo

- In-memory undo/redo stack that snapshots items + edges before each mutation
- Stack design:
  - Each entry stores `{ items: CanvasItem[]; edges: CanvasEdge[] }` — full state snapshot
  - Max stack depth: 100 entries (configurable)
  - After a new action, redo history is discarded (linear undo model)
- Actions that create a snapshot:
  - Item added/deleted
  - Item moved (snapshot at drag start, one entry for the whole drag)
  - Item resized (snapshot at resize start, one entry for the whole resize)
  - Item text edited (snapshot at blur, not per-keystroke)
  - Item color changed
  - Edge added/deleted
  - Bring to front
  - Paste / duplicate
- Actions that do NOT create a snapshot:
  - Pan/zoom (viewport only, no data change)
  - Text editing in progress (only finalized on blur)
- Keyboard shortcuts:
  - `Ctrl+Z` — undo
  - `Ctrl+Shift+Z` or `Ctrl+Y` — redo
- Toolbar buttons: undo / redo buttons next to the zoom controls (disabled when stack is empty)
- The auto-save debounce (1s) continues to fire — undoing does not cancel a pending save; it saves the reverted state on the next debounce tick
- No server-side change — undo/redo is entirely client-side

### Phase 23: Canvas — Snap-to-Grid & Alignment Guides

- Grid overlay on the canvas:
  - Toggleable via a toolbar button (grid icon)
  - Dot grid rendered via CSS background with `background-image: radial-gradient(circle, ...)`
  - Configurable grid size: small (20px), medium (40px default), large (80px)
  - Grid visible only when enabled; hidden on export PNG
- Snap behavior:
  - When dragging an item, snap its top-left corner to the nearest grid intersection
  - When resizing, snap width/height to grid increments
  - Snap threshold: within 50% of grid size (e.g., 20px for a 40px grid)
  - Items can be placed freely when grid snap is off
  - "Snap to grid" toggle button in toolbar (separate from grid visibility)
- Smart alignment guides (when grid snap is off):
  - During drag, detect when the dragged item's edges or center align with any other item's edges or center
  - Render thin colored guide lines (blue, same as Figma) at alignment points
  - Alignment tolerance: 5px
  - Supported alignments:
    - Top edges, bottom edges, left edges, right edges
    - Vertical center, horizontal center
    - Same for multiple items (if 3+ items share an alignment, show extended line)
- Distribution guide:
  - When 3+ selected items are dragged, show equal-spacing indicators if items are evenly distributed horizontally or vertically
- All guide logic is purely client-side math — no server involvement

### Phase 24: Canvas — Auto-Layout

- Add an "Auto-Layout" dropdown/split-button next to the export button with two modes:
  - **Force-Directed Layout** — arranges items using a force simulation
  - **Tree Layout** — arranges items in a rooted hierarchy
- Force-Directed Layout:
  - Items are nodes, edges are links
  - Use `d3-force` simulation (reuse from Phase 8 Graph View, but on canvas coordinates)
  - Forces: charge (items repel), link (edges pull connected items together), center (pull everything toward center of canvas)
  - Simulation runs for ~300 iterations or until alpha is low
  - Animate the transition: interpolate each item's x/y from current to target over ~500ms (CSS transition or requestAnimationFrame)
  - After layout settles, auto-save the new positions
- Tree Layout:
  - User picks a root item (or the layout picks the item with the most connections)
  - Arranges items in a top-down or left-to-right tree
  - Levels based on shortest path from root (BFS)
  - Siblings evenly spaced horizontally; levels evenly spaced vertically
  - Handles cycles gracefully (use BFS, ignore back-edges for layout)
  - Edge type (straight/curved) can auto-switch to "curved" for tree layout
- Progress indicator: if layout takes >200ms, show a small spinner in the toolbar
- Edge labels: after layout, optionally show edge labels ("depends on", "relates to") via a small text overlay on the connector midpoint
- All changes go through the same auto-save mechanism — no new server endpoints

### Phase 25: DataView / Query Engine

- Custom TipTap extension that renders `dataview` code blocks as live interactive tables/lists
- Query DSL (simple, not full SQL):
  - `LIST FROM <source>` — bullet list of notes matching tag/folder
  - `TABLE <fields> FROM <source> WHERE <condition> SORT <field>` — table view
  - Sources: `#tag`, `"folder"`, `/calendar` (notes by date range)
  - Conditionals: `created >= date(...)`, `updated <= date(...)`, `contains(title, ...)`
- Server endpoint `POST /api/dataview/query` — accepts query AST or raw query string → parses → executes against SQLite
- Result caching with cache-busting when related notes change
- Auto-refresh on note open; manual refresh button
- Editor integration: code block language picker includes `dataview`

### Phase 26: Reminders & Alerts

- New `reminders` table: `id, note_id, remind_at (datetime), title, done (boolean), created_at`
- Backend CRUD: `POST /api/notes/:id/reminders`, `GET /api/reminders` (due soon), `PUT /api/reminders/:id/done`, `DELETE /api/reminders/:id`
- Server-side periodic check: `setInterval` every 30s queries for due, undismissed reminders
- Client polls `/api/reminders` on a timer (every 30s) or uses SSE/WebSocket for push
- Browser Notification API: request permission, show native notification when a reminder fires
- In-app toast notification (reuse ToastContainer) with snooze (5 min / 15 min / 1 hr) and dismiss buttons
- Reminder picker UI in the note editor: datetime picker in a context menu or footer bar
- Calendar integration: reminder indicators (bell icon) on days in the calendar view

### Phase 27: Testing & Hardening (New Features)

- Unit tests for all new repositories and API handlers (calendar, versions, canvases, dataview query parser, reminders)
- Component tests for CalendarPage, DailyJournal, VersionHistoryPanel, CanvasView, DataView blocks, ReminderPicker
- E2E: full calendar workflow, version restore flow, canvas create/edit/export, dataview rendering
- Edge cases: ICS URL unreachable/malformed, large canvas performance, version storage limits (oldest purge), reminder timezone handling

### Phase 28: Templates (Notes + Projects) ✅ *(tests pending)*

**Data Model:**

- New `templates` table: `id, type (note|project), name, description, content (JSON blob), created_at, updated_at`
  - **Note template `content`** schema: `{ title: string; body: TipTap JSON; tags: string[]; folder: string; }`
  - **Project template `content`** schema:
    ```json
    {
      "groups": [
        {
          "name": "Development",
          "columns": [
            { "name": "Backlog", "color": "#94a3b8" },
            { "name": "In Progress", "color": "#3b82f6" },
            { "name": "Done", "color": "#22c55e" }
          ],
          "artifacts": [
            { "type": "note", "name": "Architecture Decision Record" },
            { "type": "note", "name": "API Spec" }
          ]
        }
      ]
    }
    ```

**Backend (routes/templates.ts + db/template-repository.ts):**

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/templates?type=note/project` | List templates (filtered by type) |
| POST | `/api/templates` | Create template |
| GET | `/api/templates/:id` | Get template detail |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |
| POST | `/api/templates/:id/apply?target=note/project` | Instantiate template → create note or project with groups/columns/cards/artifacts |

- `TemplateRepository` with prepared statements for all CRUD
- `POST /apply` for notes: creates a new note with title, body, tags, folder from template (replacing `{{date}}` and `{{title}}` variables)
- `POST /apply` for projects: creates a new project, then groups, then per-group columns (with color), then per-group artifacts as `project_artifacts` rows

**Frontend:**

- `TemplatesPage` (`/templates`) — grid of template cards grouped by type; create/edit/delete
- `TemplateCard` component — shows name, description, type badge, apply button
- `TemplateEditorModal` — inline form to create/edit template:
  - For note templates: capture current note title + editor content + tags + folder
  - For project templates: dynamic form to add groups, each group with columns (name + color) and predefined artifacts
- `TemplatePickerModal` — reusable modal shown on new-note and new-project creation; tabs for "Blank" and "From template"
  - New note: integrates into the existing new-note flow (sidebar button triggers picker)
  - New project: adds a "From Template" tab in the project creation dialog alongside "Blank"
- **Note editor**: "Save as template" action (menu item or toolbar button) — captures current title, TipTap JSON content, tags, folder path
- **Built-in defaults** (seeded via migration or inline):
  - **Note defaults**: "Daily Note" (`## Tasks\n## Notes`), "Meeting Notes" (`## Attendees\n## Agenda\n## Action Items`), "To-Do" (`## To-Do\n## In Progress\n## Done`)
  - **Project defaults**:
    - "Software Project" — groups: Development, QA, Documentation; each with standard kanban columns + typical artifact notes
    - "Marketing Campaign" — groups: Creative, Social Media, Analytics
    - "Research Project" — groups: Literature Review, Experiments, Publication
- **"Save Project as Template"** button on ProjectOverviewPage — captures current groups, columns, and artifact definitions
- **Template variables**: `{{date}}`, `{{title}}`, `{{today}}` replaced on instantiation; new variables `{{project_name}}`, `{{group_name}}` for project templates

### Phase 29: Export / Import

- Export single note as Markdown
- Export all notes as ZIP of `.md` files
- Import from Markdown files
- Obsidian vault import (folder structure, wikilinks, tags)
- Export as PDF (browser print)

### Phase 30: Code Syntax Highlighting

- Add highlight.js or Shiki
- TipTap extension for code block highlighting
- Language selector
- Copy-to-clipboard button

### Phase 31: Infinite Scalability (Pagination + SQL Pushdown)

- Database indexes for sort/filter columns
- Offset-based pagination with `PageRequest`/`PageResponse` types
- SQL pushdown for filtering, sorting, and counting
- Refactor `NoteRepository`, `TagRepository`, `LinkRepository` for targeted queries
- Paginated API endpoints with `limit`/`offset`
- Client pagination in Sidebar, NoteListPage, TagsPage, SearchPage, GraphPage, CommandPalette, BacklinksPanel
- Remove `getAllLinks()` and N+1 query patterns

### Phase 32: Projects (Kanban Boards & Artifact Registry)

- **Data model**: `projects`, `project_groups`, `project_columns`, `project_cards`, `project_artifacts` tables
- **Groups**: Each project has multiple groups (workstreams, BAU tracks, etc.) — each with its own kanban board and artifact collection
- **Kanban per group**: Columns with cards, drag-and-drop between columns, card positions via REAL ordering
- **Card details**: Title, description, due date, optional note link (search and link existing notes)
- **Artifact registry per group + global**: Collect corporate project documents as typed references (note, canvas, canvas item, image, kanban card, external link)
- **Drag-and-drop**: Custom `useMouseDrag` hook (shared primitive extracted from canvas patterns) for card movement between columns and column reordering
- **Shared DnD primitive**: `useMouseDrag` hook handles mousedown/mousemove/mouseup lifecycle; reused by both canvas and kanban

### Phase 33: Architecture Diagramming

- **New shape types** on canvas: `rectangle`, `rounded_rectangle`, `circle`, `diamond`, `cylinder`, `cloud`, `hexagon` — rendered as SVG elements with centered labels
- **Shape palette**: Toolbar dropdown to select and place diagram shapes on the canvas
- **Smart connectors**: Edge labels, arrowheads (start/end), dashed/dotted line styles
- **Connection ports**: Edges snap to shape edge midpoints (N/S/E/W) instead of center
- **SVG export**: Export canvas as `.svg` alongside existing PNG export
- **Diagram template**: "New Diagram" preset (grid on, snap on, shape palette open) — same canvas data model
- **Schema**: `ALIER TABLE canvas_edges` to add `label`, `style`, `arrow_start`, `arrow_end` columns

---

## Cross-Platform Build Notes

- `better-sqlite3`: uses `prebuild-install` for prebuilt binaries; falls back to `node-gyp`. Document Windows build tools requirement.
- Vite proxy in dev mode (`vite.config.ts` `server.proxy`)
- Root `dev` script uses `concurrently` for client + server
- ICS calendar sync fetches from URLs and parses iCalendar data; doesn't require platform-specific APIs
- Canvas auto-save uses debounced writes to avoid thrashing the DB
