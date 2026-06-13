import { Router } from "express";
import type Database from "better-sqlite3";
import type { NoteRepository } from "../db/note-repository.js";
import type { TagRepository } from "../db/tag-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest } from "../lib/errors.js";

type SortField = "relevance" | "updatedAt" | "title" | "createdAt";

export function createSearchRouter(
  db: Database.Database,
  noteRepo: NoteRepository,
  tagRepo?: TagRepository,
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
      const tag = typeof req.query.tag === "string" ? req.query.tag : null;
      const sort = (typeof req.query.sort === "string"
        ? req.query.sort
        : "relevance") as SortField;
      const order = typeof req.query.order === "string"
        ? req.query.order.toUpperCase()
        : "DESC";

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

      let notes = rows
        .map((r) => noteRepo.getById(r.note_id))
        .filter((n): n is NonNullable<typeof n> => n !== null);

      // Filter by tag
      if (tag && tagRepo) {
        const allTags = tagRepo.getAll();
        const tagEntry = allTags.find(
          (t) => t.name.toLowerCase() === tag.toLowerCase(),
        );
        if (tagEntry) {
          const tagNoteIds = new Set(
            tagRepo.getNoteIdsForTag(tagEntry.id),
          );
          notes = notes.filter((n) => tagNoteIds.has(n.id));
        }
      }

      // Sort
      const dir = order === "ASC" ? 1 : -1;
      if (sort === "updatedAt") {
        notes.sort(
          (a, b) =>
            dir *
            (new Date(a.updatedAt).getTime() -
              new Date(b.updatedAt).getTime()),
        );
      } else if (sort === "createdAt") {
        notes.sort(
          (a, b) =>
            dir *
            (new Date(a.createdAt).getTime() -
              new Date(b.createdAt).getTime()),
        );
      } else if (sort === "title") {
        notes.sort((a, b) =>
          dir * a.title.localeCompare(b.title),
        );
      }
      // "relevance" = keep FTS rank order (no extra sort)

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
