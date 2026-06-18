# Infinite Scalability Plan

Optimize Jotted to support an infinitely large set of notes, folders, tags, and wikilinks.

## Current Problems

Every list endpoint and component loads **everything at once** with no limits:

| Endpoint | Problem |
|---|---|
| `GET /api/notes` | `SELECT * FROM notes` — ALL notes, then filters in-memory by folder/tag |
| `GET /api/search` | FTS returns ALL matches (no LIMIT), then sorts in-memory |
| `GET /api/graph` | ALL notes + ALL links loaded at once |
| `GET /api/graph/:id` | Loads ALL links just to find connections for one note |
| `GET /api/folders` | Loads ALL notes (including content column!) just to count per folder |
| `GET /api/tags/:name/notes` | Loads ALL note IDs for tag, then fetches each note one-by-one |
| `GET /api/notes/:id/backlinks` | Loads all backlink IDs, fetches each note |
| `GET /api/notes/:id/unlinked-mentions` | `LIKE` query with no limit |

| Component | Problem |
|---|---|
| Sidebar | Loads ALL notes, ALL tags, ALL folders, ALL backlink counts |
| NoteListPage | Loads ALL notes, renders all |
| TagsPage | Loads ALL tags, ALL notes per tag |
| SearchPage | Loads ALL matching results |
| GraphPage | Loads ALL graph nodes + edges |
| CommandPalette | Loads ALL notes just to show 10 |
| FolderTree | Receives ALL notes to render per-folder items |

Additionally:
- **No database indexes** beyond PKs — every ORDER BY is a full table scan
- **`tagRepo.getAll()`** is called in `syncNoteRelations` and `enrichNote` for every note save/view
- **`linkRepo.getAllLinks()`** is called in subgraph and `enrichNote`
- **`noteRepo.getAll()`** is called in folders route, loading `content` unnecessarily

## Strategy

- **Offset-based pagination** (`limit`/`offset`) throughout
- Push filtering and sorting into SQL
- Add database indexes
- Add a `PageResponse<T>` type
- Update client components to fetch pages incrementally
- Virtual scrolling in sidebar note list
- "Load more" / infinite scroll patterns in list views
- Capped graph with progressive loading

---

## Phase 1: Database Indexes & Pagination Infrastructure

### 1a. Add indexes

```sql
CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX idx_notes_path ON notes(path);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id, note_id);
CREATE INDEX idx_links_target_id ON links(target_id, source_id);
CREATE INDEX idx_links_source_id ON links(source_id, target_id);
```

### 1b. Add pagination types

```typescript
// packages/server/src/lib/pagination.ts
interface PageRequest { limit: number; offset: number; }
interface PageResponse<T> { items: T[]; total: number; hasMore: boolean; }
function buildPageResponse<T>(items, total, limit, offset): PageResponse<T>
```

---

## Phase 2: Server Repository Refactors

### 2a. NoteRepository

- Replace `getAll()` with `list(params: NoteListParams): PageResponse<Note>`
- Build SQL with `WHERE`, `ORDER BY`, `LIMIT`/`OFFSET` dynamically
- Push folder and tag filtering to SQL (JOIN for tag, WHERE path LIKE for folder)
- Push sorting to SQL
- Count query with same WHERE clauses

### 2b. TagRepository

- Add `getNotesForTag(tagId, params): PageResponse<Note>` — single JOIN query replaces N+1
- Keep `getAll()` as-is (tags are inherently few)

### 2c. LinkRepository

- Add `getBacklinksPaginated(noteId, params): PageResponse<string>`
- Add `getLinksForNote(noteId): Link[]` — replaces `getAllLinks().filter()`
- Remove `getAllLinks()` — no call sites should load ALL links

### 2d. Fix syncNoteRelations / enrichNote

- Replace `tagRepo.getAll().filter(...)` with targeted query
- Replace `linkRepo.getAllLinks().filter(...)` with `getLinksForNote(id)`

---

## Phase 3: Server API Endpoint Changes

| Endpoint | Change |
|---|---|
| `GET /api/notes` | Add `limit`, `offset`, `sort`, `order` params; SQL pushdown |
| `GET /api/search` | Add `limit`, `offset`; SQL sort; JOIN tag filter |
| `GET /api/tags/:name/notes` | Add `limit`, `offset`; single JOIN query |
| `GET /api/notes/:id/backlinks` | Add `limit`, `offset`; paginated |
| `GET /api/notes/:id/unlinked-mentions` | Add `limit`, `offset`; paginated |
| `GET /api/graph` | Add `limit`, `offset` for nodes; capped |
| `GET /api/graph/:id` | Use `getLinksForNote()` instead of `getAllLinks()` |
| `GET /api/folders` | Use `GROUP BY path` instead of `getAll()` |

---

## Phase 4: Client Types & API Layer

### 4a. Types

- `PageResponse<T>` type
- `NoteListParams` with `limit`, `offset`, `folder`, `tag`, `sort`, `order`

### 4b. RTK Query API

- Update list endpoints to accept pagination params and return `PageResponse`
- Keep single-item endpoints as-is

### 4c. Infinite scroll hook

- `useInfiniteScroll` hook that accumulates pages from a lazy query

---

## Phase 5: Client Component Changes

| Component | Change |
|---|---|
| Sidebar | Paginated notes, `@tanstack/react-virtual` for scrolling |
| FolderTree | Lazy load notes per folder on expand; remove `notes` prop |
| NoteListPage | Infinite scroll with "load more" |
| TagsPage | Paginated tag notes |
| SearchPage | Paginated results |
| GraphPage | Capped graph (200 nodes default), "show more" |
| CommandPalette | Use `searchSuggest` endpoint instead of loading all notes |
| BacklinksPanel | Paginated backlinks list |

---

## Phase 6: Backward Compatibility & Cleanup

- All endpoints default to sensible limits (50 for notes, 20 for search, etc.)
- Existing clients without pagination params get limited results (not broken)
- RTK Query cache tags handle invalidation correctly
- Remove `getAllLinks()`, `noteRepo.getAll()` call sites
- TypeScript check and test suite throughout

---

## Implementation Order

1. DB indexes + pagination types (low-risk, no behavior change)
2. `NoteRepository.list()` + folder route optimization
3. `TagRepository.getNotesForTag()` + `LinkRepository` new methods
4. Update routes one by one, starting with `GET /api/notes`
5. Fix `syncNoteRelations` / `enrichNote`
6. Update RTK Query endpoints + types
7. Create `useInfiniteScroll` hook
8. Update components
9. Remove unused methods
10. Verify builds + tests
