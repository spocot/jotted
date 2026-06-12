import { Router } from "express";
import type Database from "better-sqlite3";
import type { NoteRepository } from "../db/note-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest } from "../lib/errors.js";

export function createSearchRouter(
  db: Database.Database,
  noteRepo: NoteRepository,
): Router {
  const router = Router();

  const searchStmt = db.prepare(
    "SELECT note_id FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank",
  );

  const suggestStmt = db.prepare(
    "SELECT id, title FROM notes WHERE title LIKE ? ORDER BY updated_at DESC LIMIT 10",
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const q = req.query.q;
      if (typeof q !== "string" || !q.trim()) {
        throw new BadRequest("query parameter q is required");
      }

      const query = q.trim();

      const ftsQuery = query
        .split(/\s+/)
        .map((term) => `"${term.replace(/"/g, "")}"`)
        .join(" AND ");

      let rows: { note_id: string }[] = [];
      try {
        rows = searchStmt.all(ftsQuery) as { note_id: string }[];
      } catch {
        rows = [];
      }

      const notes = rows
        .map((r) => noteRepo.getById(r.note_id))
        .filter((n): n is NonNullable<typeof n> => n !== null);

      res.json(notes);
    }),
  );

  router.get(
    "/suggest",
    asyncHandler(async (req, res) => {
      const q = req.query.q;
      if (typeof q !== "string" || !q.trim()) {
        res.json([]);
        return;
      }

      const rows = suggestStmt.all(`${q.trim()}%`) as {
        id: string;
        title: string;
      }[];
      res.json(rows);
    }),
  );

  return router;
}
