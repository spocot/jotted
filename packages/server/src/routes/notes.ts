import { Router } from "express";
import type { NoteRepository } from "../db/note-repository.js";
import type { TagRepository } from "../db/tag-repository.js";
import type { LinkRepository } from "../db/link-repository.js";
import type { VersionRepository } from "../db/version-repository.js";
import { parseContent } from "../parser/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, Conflict, NotFound } from "../lib/errors.js";
import {
  clampLimit,
  parseSort,
  parseOrder,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  BACKLINK_DEFAULT_LIMIT,
} from "../lib/pagination.js";

export function createNotesRouter(
  noteRepo: NoteRepository,
  tagRepo: TagRepository,
  linkRepo: LinkRepository,
  versionRepo?: VersionRepository,
): Router {
  const router = Router();

  router.get(
    "/backlink-counts",
    asyncHandler(async (_req, res) => {
      res.json(linkRepo.getBacklinkCounts());
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { folder, tag, sort, order, limit, offset } = req.query;
      const result = noteRepo.list({
        limit: clampLimit(limit, DEFAULT_LIMIT, MAX_LIMIT),
        offset: Math.max(0, Number(offset) || 0),
        folder: typeof folder === "string" && folder ? folder : undefined,
        tag: typeof tag === "string" && tag ? tag : undefined,
        sort: parseSort(sort),
        order: parseOrder(order),
      });
      res.json(result);
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { title, content, path } = req.body;

      if (!title && !content) {
        throw new BadRequest("title or content is required");
      }

      if (path !== undefined && (typeof path !== "string" || !path.startsWith("/"))) {
        throw new BadRequest("path must be a string starting with /");
      }

      const note = noteRepo.create({ title, content, path });
      syncNoteRelations(note.id, content ?? "", noteRepo, tagRepo, linkRepo);

      const full = enrichNote(note.id, noteRepo, tagRepo, linkRepo);
      res.status(201).json(full);
    }),
  );

  router.get(
    "/daily/streak",
    asyncHandler(async (_req, res) => {
      res.json({ streak: noteRepo.getDailyStreak() });
    }),
  );

  router.get(
    "/daily",
    asyncHandler(async (req, res) => {
      const limit = clampLimit(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const result = noteRepo.getDailyNotes(limit, offset);
      res.json(result);
    }),
  );

  router.get(
    "/by-title/:title",
    asyncHandler(async (req, res) => {
      const title = req.params.title as string;
      const note = noteRepo.getByTitle(title);
      if (!note) throw new NotFound("Note not found");
      res.json(note);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const tags = tagRepo.getTagsForNote(id);
      const backlinks = linkRepo.getBacklinks(id);
      const outgoingLinks = linkRepo.getOutgoingLinks(id);

      res.json({ ...note, tags, backlinks, outgoingLinks });
    }),
  );

  router.get(
    "/:id/backlinks",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const limit = clampLimit(req.query.limit, BACKLINK_DEFAULT_LIMIT, MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const result = linkRepo.getBacklinkNotes(id, limit, offset);

      res.json(result);
    }),
  );

  router.get(
    "/:id/unlinked-mentions",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      if (!note.title.trim()) {
        res.json({ items: [], total: 0, hasMore: false });
        return;
      }

      const backlinkIds = new Set(linkRepo.getBacklinks(id));
      const title = note.title.trim();
      const titleLower = title.toLowerCase();
      const candidates = noteRepo.findByContentContaining(title);

      const unlinked = candidates.filter((c) => {
        if (c.id === id) return false;
        if (backlinkIds.has(c.id)) return false;
        return c.content.toLowerCase().includes(titleLower);
      });

      const limit = clampLimit(req.query.limit, 10, MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const total = unlinked.length;
      const items = unlinked.slice(offset, offset + limit);

      res.json({ items, total, hasMore: offset + limit < total });
    }),
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const existing = noteRepo.getById(id);
      if (!existing) throw new NotFound("Note not found");

      const { title, content, path } = req.body;

      if (title !== undefined && title !== existing.title && noteRepo.titleExists(title, id)) {
        throw new Conflict(`A note with the title "${title}" already exists`);
      }

      if (path !== undefined && (typeof path !== "string" || !path.startsWith("/"))) {
        throw new BadRequest("path must be a string starting with /");
      }

      // Snapshot current state before updating
      if (versionRepo) {
        versionRepo.create(id, existing.title, existing.content);
      }

      const note = noteRepo.update(id, { title, content, path });
      if (!note) throw new NotFound("Note not found");

      syncNoteRelations(note.id, note.content, noteRepo, tagRepo, linkRepo);

      const full = enrichNote(note.id, noteRepo, tagRepo, linkRepo);
      res.json(full);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const existing = noteRepo.getById(id);
      if (!existing) throw new NotFound("Note not found");

      noteRepo.delete(id);
      res.status(204).end();
    }),
  );

  router.post(
    "/:id/tags",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const { name } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        throw new BadRequest("Tag name is required");
      }

      const tag = tagRepo.upsert(name.trim());
      tagRepo.addToNote(note.id, tag.id);

      const full = enrichNote(id, noteRepo, tagRepo, linkRepo);
      res.json(full);
    }),
  );

  router.delete(
    "/:id/tags/:tagName",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const tag = tagRepo.getByName(req.params.tagName as string);
      if (!tag) throw new NotFound("Tag not found");

      tagRepo.removeFromNote(note.id, tag.id);
      tagRepo.deleteUnused();

      const full = enrichNote(id, noteRepo, tagRepo, linkRepo);
      res.json(full);
    }),
  );

  return router;
}

function syncNoteRelations(
  noteId: string,
  content: string,
  noteRepo: NoteRepository,
  tagRepo: TagRepository,
  linkRepo: LinkRepository,
): void {
  const { wikilinks, tags } = parseContent(content);

  const currentTags = tagRepo.getTagsForNote(noteId);
  const currentTagIds = currentTags.map((t) => t.id);

  const newTagIds: string[] = [];
  for (const tagMatch of tags) {
    const t = tagRepo.upsert(tagMatch.name);
    newTagIds.push(t.id);
    if (!currentTagIds.includes(t.id)) {
      tagRepo.addToNote(noteId, t.id);
    }
  }

  for (const tagId of currentTagIds) {
    if (!newTagIds.includes(tagId)) {
      tagRepo.removeFromNote(noteId, tagId);
    }
  }

  const targetIds: string[] = [];
  for (const wl of wikilinks) {
    const target = noteRepo.getByTitle(wl.target);
    if (target) {
      targetIds.push(target.id);
    }
  }
  linkRepo.setLinks(noteId, targetIds);

  tagRepo.deleteUnused();
}

function enrichNote(
  noteId: string,
  noteRepo: NoteRepository,
  tagRepo: TagRepository,
  linkRepo: LinkRepository,
): Record<string, unknown> {
  const note = noteRepo.getById(noteId);
  if (!note) return {};

  const tags = tagRepo.getTagsForNote(noteId);
  const backlinks = linkRepo.getBacklinks(note.id);
  const outgoingLinks = linkRepo.getOutgoingLinks(note.id);

  return { ...note, tags, backlinks, outgoingLinks };
}
