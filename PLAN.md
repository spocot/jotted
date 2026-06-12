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

---

## Cross-Platform Build Notes

- `better-sqlite3`: uses `prebuild-install` for prebuilt binaries; falls back to `node-gyp`. Document Windows build tools requirement.
- Vite proxy in dev mode (`vite.config.ts` `server.proxy`)
- Root `dev` script uses `concurrently` for client + server
