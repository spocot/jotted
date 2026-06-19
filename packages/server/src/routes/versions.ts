import { Router } from "express";
import type { NoteRepository } from "../db/note-repository.js";
import type { TagRepository } from "../db/tag-repository.js";
import type { LinkRepository } from "../db/link-repository.js";
import type { VersionRepository } from "../db/version-repository.js";
import { parseContent } from "../parser/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";
import { clampLimit, DEFAULT_LIMIT, MAX_LIMIT } from "../lib/pagination.js";

export function createVersionsRouter(
  noteRepo: NoteRepository,
  tagRepo: TagRepository,
  linkRepo: LinkRepository,
  versionRepo: VersionRepository,
): Router {
  const router = Router();

  router.get(
    "/:id/versions",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const limit = clampLimit(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);

      const result = versionRepo.listByNoteId(id, limit, offset);
      res.json(result);
    }),
  );

  router.get(
    "/:id/versions/:versionId",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const versionId = req.params.versionId as string;

      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const version = versionRepo.getById(versionId);
      if (!version) throw new NotFound("Version not found");
      if (version.noteId !== id) throw new NotFound("Version not found for this note");

      res.json(version);
    }),
  );

  router.post(
    "/:id/versions/:versionId/restore",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const versionId = req.params.versionId as string;

      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const version = versionRepo.getById(versionId);
      if (!version) throw new NotFound("Version not found");
      if (version.noteId !== id) throw new NotFound("Version not found for this note");

      // Snapshot current state before restoring
      versionRepo.create(note.id, note.title, note.content);

      // Restore the version content
      const updated = noteRepo.update(id, {
        title: version.title,
        content: version.content,
      });
      if (!updated) throw new NotFound("Note not found");

      // Re-sync tags and wikilinks from restored content
      syncNoteRelations(updated.id, updated.content, noteRepo, tagRepo, linkRepo);

      const full = enrichNote(updated.id, noteRepo, tagRepo, linkRepo);
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
