import { Router } from "express";
import type { NoteRepository } from "../db/note-repository.js";
import type { VersionRepository } from "../db/version-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";
import { clampLimit, DEFAULT_LIMIT, MAX_LIMIT } from "../lib/pagination.js";

export function createVersionsRouter(
  noteRepo: NoteRepository,
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

      res.json(updated);
    }),
  );

  return router;
}
