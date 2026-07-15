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

## Deployment

Jotted uses a **split deployment model**: the client UI is hosted on a public URL (e.g., GitHub Pages), while the server runs locally on your machine via Docker. Your data stays on your machine — the client never sends notes to any remote server.

### Running the Server (Docker)

Build the image from source:

```bash
docker build -t jotted-server -f packages/server/Dockerfile .
```

Then run it:

```bash
docker run -d \
  --name jotted-server \
  -p 3000:3000 \
  -v $(pwd)/jotted-data:/data \
  jotted-server
```

Or pull a pre-built image from a registry:

```bash
docker run -d \
  --name jotted-server \
  -p 3000:3000 \
  -v $(pwd)/jotted-data:/data \
  ghcr.io/<your-org>/jotted-server:latest
```

The server stores the SQLite database and uploaded files in the mounted `/data` directory. Customize with environment variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `DB_PATH` | `/data/jotted.db` | SQLite database path |
| `UPLOADS_DIR` | `/data/uploads` | File upload directory |

### Deploying the Client

#### GitHub Pages

1. Fork the repository
2. Go to **Settings → Pages** and set source to **GitHub Actions**
3. The included workflow (`.github/workflows/deploy-client.yml`) builds and deploys on every push to `main`
4. Your client will be available at `https://<username>.github.io/jotted`

#### Self-Hosted Web Server

Build the client with a `--base` flag matching the subdirectory where it will be served:

```bash
# Build for root (e.g. https://example.com/)
npm run build -w packages/client

# Build for a subdirectory (e.g. https://example.com/jotted/)
npm run build -w packages/client -- --base /jotted/
```

The output is in `packages/client/dist/`. Serve this directory with any static file server. You must configure SPA fallback so that all client-side routes (e.g. `/note/123`) are served by `index.html`.

**nginx:**
```
server {
    listen 80;
    server_name example.com;

    location /jotted/ {
        alias /path/to/jotted/packages/client/dist/;
        try_files $uri $uri/ /jotted/index.html;
    }
}
```

**Apache `.htaccess`:**
```
RewriteEngine On
RewriteBase /jotted/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /jotted/index.html [L]
```

**Caddy:**
```
example.com {
    handle_path /jotted/* {
        root * /path/to/jotted/packages/client/dist/
        try_files {path} /index.html
        file_server
    }
}
```

**One-liner for local testing:**
```bash
npx serve packages/client/dist -l 4173
```

#### Pre-Built Release

Tagged releases include a `jotted-client.zip` of the built client (root base, ready for any web server):

1. Push a version tag: `git tag v1.0.0 && git push --tags`
2. Or trigger manually from the **Actions → Release Client → Run workflow** tab
3. Download `jotted-client.zip` from the [Releases](https://github.com/anomalyco/jotted/releases) page

### Connecting Client to Server

1. Open the deployed client in your browser
2. Click the **Settings** (gear) icon in the header
3. The server URL defaults to `http://localhost:3000` — this works if you're running the Docker container on the same machine
4. Click **Test Connection** to verify, then **Save**
5. If you change the port or run the server on a different machine, update the URL accordingly

> **Note:** GitHub Pages serves over HTTPS, but all modern browsers allow `http://localhost` requests from HTTPS pages as a security exception for local development tools.

### Building from Source

```bash
npm install
npm run build
npm run dev   # Dev mode: client :5173, server :3000
```

## Development Plan

See [PLAN.md](PLAN.md) for the full implementation roadmap.
