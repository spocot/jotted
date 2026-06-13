import { Router } from "express";
import type { NoteRepository } from "../db/note-repository.js";
import type { TagRepository } from "../db/tag-repository.js";
import type { LinkRepository } from "../db/link-repository.js";
import { parseContent } from "../parser/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";

export function createNotesRouter(
  noteRepo: NoteRepository,
  tagRepo: TagRepository,
  linkRepo: LinkRepository,
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
      const { folder, tag } = req.query;
      let notes = noteRepo.getAll();

      if (typeof folder === "string" && folder) {
        notes = notes.filter((n) => n.path.startsWith(folder));
      }

      if (typeof tag === "string" && tag) {
        const tagObj = tagRepo.getByName(tag);
        if (tagObj) {
          const noteIds = new Set(tagRepo.getNoteIdsForTag(tagObj.id));
          notes = notes.filter((n) => noteIds.has(n.id));
        } else {
          notes = [];
        }
      }

      res.json(notes);
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { title, content, path } = req.body;

      if (!title && !content) {
        throw new BadRequest("title or content is required");
      }

      const note = noteRepo.create({ title, content, path });
      syncNoteRelations(note.id, content ?? "", noteRepo, tagRepo, linkRepo);

      const full = enrichNote(note.id, noteRepo, tagRepo, linkRepo);
      res.status(201).json(full);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const tags = tagRepo.getAll().filter((t) =>
        tagRepo.getNoteIdsForTag(t.id).includes(note.id),
      );
      const backlinks = linkRepo.getBacklinks(id);
      const outgoingLinks = linkRepo.getAllLinks().filter((l) => l.sourceId === id);

      res.json({ ...note, tags, backlinks, outgoingLinks });
    }),
  );

  router.get(
    "/:id/backlinks",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const backlinkIds = linkRepo.getBacklinks(id);
      const notes = backlinkIds
        .map((id) => noteRepo.getById(id))
        .filter((n): n is NonNullable<typeof n> => n !== null);

      res.json(notes);
    }),
  );

  router.get(
    "/:id/unlinked-mentions",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      if (!note.title.trim()) {
        res.json([]);
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

      res.json(unlinked);
    }),
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const existing = noteRepo.getById(id);
      if (!existing) throw new NotFound("Note not found");

      const { title, content, path } = req.body;

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

  const currentTagIds = tagRepo
    .getAll()
    .filter((t) => tagRepo.getNoteIdsForTag(t.id).includes(noteId))
    .map((t) => t.id);

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
    console.log(`Processing wikilink [[${wl.target}]] in note ${noteId}, found target: ${target?.id}`);
    console.log(JSON.stringify(target));
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

  const tags = tagRepo.getAll().filter((t) =>
    tagRepo.getNoteIdsForTag(t.id).includes(note.id),
  );
  const backlinks = linkRepo.getBacklinks(note.id);
  const outgoingLinks = linkRepo.getAllLinks().filter((l) => l.sourceId === note.id);

  return { ...note, tags, backlinks, outgoingLinks };
}
