import express from "express";
import cors from "cors";
import { getDb } from "./db/index.js";
import { NoteRepository } from "./db/note-repository.js";
import { TagRepository } from "./db/tag-repository.js";
import { LinkRepository } from "./db/link-repository.js";
import { VersionRepository } from "./db/version-repository.js";
import { CanvasRepository } from "./db/canvas-repository.js";
import { createNotesRouter } from "./routes/notes.js";
import { createCanvasesRouter } from "./routes/canvases.js";
import { createTagsRouter } from "./routes/tags.js";
import { createSearchRouter } from "./routes/search.js";
import { createGraphRouter } from "./routes/graph.js";
import { createFoldersRouter } from "./routes/folders.js";
import { createVersionsRouter } from "./routes/versions.js";
import { createUploadsRouter } from "./routes/uploads.js";
import { createCalendarRouter } from "./routes/calendar.js";
import { createOutlookRouter } from "./routes/outlook.js";
import { AppError } from "./lib/errors.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { Request, Response, NextFunction } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

app.use(cors());
app.use(express.json());
const UPLOADS_DIR_STATIC = process.env.UPLOADS_DIR || join(__dirname, "../uploads");
app.use("/uploads", express.static(UPLOADS_DIR_STATIC));

const db = getDb();
const noteRepo = new NoteRepository(db);
const tagRepo = new TagRepository(db);
const linkRepo = new LinkRepository(db);
const versionRepo = new VersionRepository(db);
const canvasRepo = new CanvasRepository(db);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/notes", createNotesRouter(noteRepo, tagRepo, linkRepo, versionRepo));
app.use("/api/canvases", createCanvasesRouter(canvasRepo));
app.use("/api/notes", createVersionsRouter(noteRepo, tagRepo, linkRepo, versionRepo));
app.use("/api/tags", createTagsRouter(tagRepo, noteRepo));
app.use("/api/search", createSearchRouter(db, noteRepo, tagRepo));
app.use("/api/graph", createGraphRouter(noteRepo, linkRepo, tagRepo));
app.use("/api/folders", createFoldersRouter(noteRepo));
app.use("/api/uploads", createUploadsRouter(db));
app.use("/api/calendar", createCalendarRouter(noteRepo));
app.use("/api/calendar/outlook", createOutlookRouter());

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
  } else {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
