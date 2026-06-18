import { Router } from "express";
import type Database from "better-sqlite3";
import type { NoteRepository } from "../db/note-repository.js";
import type { TagRepository } from "../db/tag-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest } from "../lib/errors.js";
import {
  clampLimit,
  parseSort,
  parseOrder,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
} from "../lib/pagination.js";
import type { PageResponse } from "../lib/pagination.js";
import type { Note } from "../db/note-repository.js";

type SortField = "relevance" | "updatedAt" | "title" | "createdAt";

export function createSearchRouter(
  db: Database.Database,
  noteRepo: NoteRepository,
  tagRepo?: TagRepository,
): Router {
  const router = Router();

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
      const order = parseOrder(req.query.order);
      const limit = clampLimit(req.query.limit, SEARCH_DEFAULT_LIMIT, SEARCH_MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);

      const ftsQuery = query
        .split(/\s+/)
        .map((term) => `"${term.replace(/"/g, "")}"`)
        .join(" AND ");

      let noteIds: string[] = [];
      try {
        const rows = db
          .prepare("SELECT note_id FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank LIMIT ? OFFSET ?")
          .all(ftsQuery, limit, offset) as { note_id: string }[];
        noteIds = rows.map((r) => r.note_id);
      } catch {
        res.json({ items: [], total: 0, hasMore: false });
        return;
      }

      // Get total count for pagination
      let total = 0;
      try {
        const countRow = db
          .prepare("SELECT COUNT(*) AS count FROM notes_fts WHERE notes_fts MATCH ?")
          .get(ftsQuery) as { count: number };
        total = countRow.count;
      } catch {
        // ignore
      }

      if (noteIds.length === 0) {
        res.json({ items: [], total: 0, hasMore: false });
        return;
      }

      // Fetch notes by IDs
      const placeholders = noteIds.map(() => "?").join(",");
      let notes = db
        .prepare(
          `SELECT id, title, content, path, created_at AS createdAt, updated_at AS updatedAt
           FROM notes WHERE id IN (${placeholders})`,
        )
        .all(...noteIds) as Note[];

      // Preserve FTS rank order
      const idOrder = new Map(noteIds.map((id, i) => [id, i]));
      notes.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));

      // Filter by tag
      if (tag && tagRepo) {
        const tagEntry = tagRepo.getByName(tag);
        if (tagEntry) {
          const tagNoteIds = new Set(tagRepo.getNoteIdsForTag(tagEntry.id));
          notes = notes.filter((n) => tagNoteIds.has(n.id));
        }
      }

      // Sort (only for non-relevance sorts that are requested before pagination)
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

      const result: PageResponse<Note> = {
        items: notes,
        total,
        hasMore: offset + limit < total,
      };

      res.json(result);
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
