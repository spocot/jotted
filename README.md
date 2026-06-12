# Jotted

A local-first, Obsidian-like note-taking web application. Write notes in Markdown with rich text editing, link notes together with `[[wikilinks]]`, organize with `#tags`, explore connections in the graph view, and find anything instantly with full-text search.

## Features

- **Rich Text Editor** — WYSIWYG Markdown editing powered by TipTap
- **Wikilinks** — `[[Note Title]]` to link notes together
- **Tagging** — `#tag` inline organization with tag browser
- **Graph View** — Visualize note connections with D3.js
- **Full-Text Search** — Instant search via SQLite FTS5
- **Backlinks** — See what links to your current note
- **Dark Mode** — Light/dark theme toggle
- **Keyboard Shortcuts** — `Ctrl+P` quick open, `Ctrl+N` new note, and more

## Architecture

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Express + TypeScript + SQLite (better-sqlite3)
- **Content:** All notes stored as Markdown in SQLite with parsed link/tag metadata

## Getting Started

```bash
# Install dependencies
npm install

# Start development (client + server)
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000

## Project Structure

```
packages/
├── client/         # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route pages
│   │   ├── store/       # Zustand state
│   │   ├── hooks/       # Custom React hooks
│   │   ├── api/         # API client
│   │   └── types/       # TypeScript types
│   └── vite.config.ts
└── server/         # Express backend
    ├── src/
    │   ├── routes/      # API route handlers
    │   ├── db/          # Database schema & queries
    │   ├── parser/      # Link/tag content parsers
    │   └── index.ts     # Server entry
    └── package.json
```

## Development Plan

See [PLAN.md](PLAN.md) for the full implementation roadmap.
