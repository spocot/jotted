# Jotted — Agent Guidelines

## Project Overview

A local-first Obsidian-like note-taking app: React frontend + Express/SQLite backend. npm workspaces monorepo with `packages/client` and `packages/server`.

## Build / Run / Test Commands

```bash
# Install all dependencies (from root)
npm install

# Start both servers in dev mode (client :5173, server :3000)
npm run dev

# Build all packages
npm run build

# --- Server ---
npm run dev -w packages/server      # Dev (hot reload via tsx watch)
npm run build -w packages/server    # Build (tsc to dist/)
npm run start -w packages/server    # Start production

# --- Client ---
npm run dev -w packages/client      # Dev (Vite)
npm run build -w packages/client    # Build (tsc + vite build)
npm run preview -w packages/client  # Preview production build

# --- Type Checking ---
npx -w packages/server tsc --noEmit
npx -w packages/client tsc --noEmit

# --- Testing ---
npm run test -w packages/server     # All server tests
npm run test -w packages/client     # All client tests
npx -w packages/server vitest run src/routes/notes.test.ts  # Single test file
npx -w packages/client vitest run src/components/ToastContainer.test.tsx  # Single test file

# Commands to run before committing
npm run build -w packages/server
npm run build -w packages/client
npx -w packages/server tsc --noEmit
npx -w packages/client tsc --noEmit
```

## Code Style Guidelines

### Imports

Group: (1) external libs, (2) internal modules, (3) CSS/assets. Blank line between groups.
Named imports for React/Router: `import { useState } from 'react'`. Default-export components.
Path aliases if configured; otherwise relative imports (`../components/...`).

### Formatting

- **Quotes:** Double quotes for strings and JSX attributes
- **Semicolons:** Required
- **Indentation:** 2 spaces
- **Line length:** Soft limit of 100 characters
- **Trailing commas:** Always add where valid
- **JSX:** Self-close tags without children: `<Spacer />`

### Naming Conventions

| Kind | Convention | Example |
|---|---|---|
| Files/directories | kebab-case | `note-editor.tsx`, `use-note-store.ts` |
| React components | PascalCase | `NoteEditor`, `GraphView` |
| Hooks | camelCase, prefixed `use` | `useNotes`, `useSearch` |
| Stores | camelCase, prefixed `use`, suffixed `Store` | `useNoteStore` |
| Functions/variables | camelCase | `fetchNotes`, `noteId` |
| Constants | UPPER_SNAKE_CASE | `PORT`, `DEBOUNCE_MS` |
| Types/interfaces | PascalCase, avoid `I` prefix | `Note`, `NoteCreatePayload` |
| Enums | PascalCase | `ViewMode`, `SortField` |
| DB tables | snake_case | `note_tags`, `notes_fts` |
| API routes | kebab-case | `/api/search/suggest` |

### Types

- **Prefer `interface`** for object shapes; use `type` for unions/aliases
- Shared types in `packages/client/src/types/`
- Avoid `any`. Use `unknown` and narrow with type guards
- `const` over `let`; optional chaining and nullish coalescing: `note?.title ?? 'Untitled'`
```typescript
interface Note { id: string; title: string; content: string; tags: string[]; createdAt: string; updatedAt: string; }
type SortField = 'updatedAt' | 'title' | 'createdAt';
```

### React / JSX

- **Functional components only**, explicit return types, omit `React.FC`
- Destructure props in signature; Tailwind `className`; no inline styles
- `components/` for reusable UI, `pages/` for routes, `hooks/` for custom hooks, `store/` for Zustand, `api/` for API client
```typescript
export default function Sidebar({ notes, onSelect }: SidebarProps) {
  return <aside className="w-64 border-r border-gray-200 dark:border-gray-800">
    {notes.map(n => <button key={n.id} onClick={() => onSelect(n.id)}>{n.title}</button>)}
  </aside>;
}
```

### State Management (Zustand)

```typescript
import { create } from 'zustand';
interface NotesState { notes: Note[]; selectedId: string | null; fetchNotes: () => Promise<void>; setSelectedId: (id: string | null) => void; }
export const useNoteStore = create<NotesState>((set) => ({
  notes: [], selectedId: null,
  fetchNotes: async () => { const notes = await api.getNotes(); set({ notes }); },
  setSelectedId: (id) => set({ selectedId: id }),
}));
```

### Server (Express)

- Route handlers in `routes/`, grouped by domain, using `express.Router()`
- DB logic in `db/` — repository classes with prepared statements
- Parsers in `parser/` — pure functions, no side effects
- Wrap async handlers; return `{ error: string }` with appropriate status codes

### Error Handling

- Server: centralized error middleware in `index.ts` — catches all `next(err)`
- HTTP: 400 (validation), 404 (not found), 409 (conflict), 500 (server)
- Client: API client throws on non-2xx; components catch and show toast/error UI

### Styling (Tailwind CSS)

- Prefer inline classes over `@apply`; dark mode via `dark:` prefix and `class` strategy
- Standard breakpoints: `sm:`, `md:`, `lg:`, `xl:`; default gray palette

### Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`
- Present tense, lowercase after colon: `feat: add graph view zoom interaction`

## Project Conventions

- ESM throughout (`"type": "module"` in both packages)
- Port 3000 for server, 5173 for client (Vite default)
- Vite proxy routes `/api/*` to `localhost:3000` in dev
- better-sqlite3: prebuild binaries with node-gyp fallback (needs build tools on Windows)

## Testing Strategy (Future)

- Server: vitest + supertest for HTTP, better-sqlite3 `:memory:` for DB tests
- Client: vitest + React Testing Library + happy-dom/jsdom
- E2E: Playwright against the full running app
- Test files co-located: `src/notes.ts` → `src/notes.test.ts`
