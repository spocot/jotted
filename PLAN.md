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

### Phase 16: Daily Notes / Journal

- "Open Today" button in the header and keyboard shortcut — opens or creates a note with title `YYYY-MM-DD`
- Journal page at `/journal` — a reverse-chronological timeline of daily notes
- Automatic daily note creation on first open of the day (configurable)
- Daily note template: pre-populates with date, day of week, and a "## Tasks" / "## Notes" structure
- Calendar integration: clicking a date on the calendar opens the daily note for that day
- Streak counter (consecutive days with a daily note)

### Phase 17: Note Version History

- New `note_versions` table: `id, note_id, content, title, created_at` — stores a snapshot on each save
- Server-side: on every note update, insert a version row (cheap — text snapshots)
- Backend endpoint: `GET /api/notes/:id/versions` — list versions with timestamps
- Backend endpoint: `GET /api/notes/:id/versions/:versionId` — get full snapshot content
- Backend endpoint: `POST /api/notes/:id/versions/:versionId/restore` — restore a version
- "Version History" panel in the note editor (toggleable sidebar/tab)
- Timeline view showing versions with formatted timestamps and character-count diffs
- Side-by-side or unified diff view between selected versions
- "Restore" button with confirmation dialog

### Phase 18: Mind Map / Canvas View

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

### Phase 19: DataView / Query Engine

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

### Phase 20: Reminders & Alerts

- New `reminders` table: `id, note_id, remind_at (datetime), title, done (boolean), created_at`
- Backend CRUD: `POST /api/notes/:id/reminders`, `GET /api/reminders` (due soon), `PUT /api/reminders/:id/done`, `DELETE /api/reminders/:id`
- Server-side periodic check: `setInterval` every 30s queries for due, undismissed reminders
- Client polls `/api/reminders` on a timer (every 30s) or uses SSE/WebSocket for push
- Browser Notification API: request permission, show native notification when a reminder fires
- In-app toast notification (reuse ToastContainer) with snooze (5 min / 15 min / 1 hr) and dismiss buttons
- Reminder picker UI in the note editor: datetime picker in a context menu or footer bar
- Calendar integration: reminder indicators (bell icon) on days in the calendar view

### Phase 21: Testing & Hardening (New Features)

- Unit tests for all new repositories and API handlers (calendar, versions, canvases, dataview query parser, reminders)
- Component tests for CalendarPage, DailyJournal, VersionHistoryPanel, CanvasView, DataView blocks, ReminderPicker
- E2E: full calendar workflow, version restore flow, canvas create/edit/export, dataview rendering
- Edge cases: ICS URL unreachable/malformed, large canvas performance, version storage limits (oldest purge), reminder timezone handling

### Phase 22: Note Templates

- Server CRUD for templates
- Template picker on new-note creation
- Built-in defaults (Daily Note, Meeting Notes, To-Do)
- "Save as template" action from editor
- Template variables: `{{date}}`, `{{title}}`

### Phase 23: Export / Import

- Export single note as Markdown
- Export all notes as ZIP of `.md` files
- Import from Markdown files
- Obsidian vault import (folder structure, wikilinks, tags)
- Export as PDF (browser print)

### Phase 24: Code Syntax Highlighting

- Add highlight.js or Shiki
- TipTap extension for code block highlighting
- Language selector
- Copy-to-clipboard button

---

## Cross-Platform Build Notes

- `better-sqlite3`: uses `prebuild-install` for prebuilt binaries; falls back to `node-gyp`. Document Windows build tools requirement.
- Vite proxy in dev mode (`vite.config.ts` `server.proxy`)
- Root `dev` script uses `concurrently` for client + server
- ICS calendar sync fetches from URLs and parses iCalendar data; doesn't require platform-specific APIs
- Canvas auto-save uses debounced writes to avoid thrashing the DB
