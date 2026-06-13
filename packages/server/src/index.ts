import express from "express";
import cors from "cors";
import { getDb } from "./db/index.js";
import { NoteRepository } from "./db/note-repository.js";
import { TagRepository } from "./db/tag-repository.js";
import { LinkRepository } from "./db/link-repository.js";
import { createNotesRouter } from "./routes/notes.js";
import { createTagsRouter } from "./routes/tags.js";
import { createSearchRouter } from "./routes/search.js";
import { createGraphRouter } from "./routes/graph.js";
import { AppError } from "./lib/errors.js";
import type { Request, Response, NextFunction } from "express";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = getDb();
const noteRepo = new NoteRepository(db);
const tagRepo = new TagRepository(db);
const linkRepo = new LinkRepository(db);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/notes", createNotesRouter(noteRepo, tagRepo, linkRepo));
app.use("/api/tags", createTagsRouter(tagRepo, noteRepo));
app.use("/api/search", createSearchRouter(db, noteRepo));
app.use("/api/graph", createGraphRouter(noteRepo, linkRepo, tagRepo));

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
  } else {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
