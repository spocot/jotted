import { Router } from "express";
import type { TagRepository } from "../db/tag-repository.js";
import type { NoteRepository } from "../db/note-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { NotFound } from "../lib/errors.js";

export function createTagsRouter(
  tagRepo: TagRepository,
  noteRepo: NoteRepository,
): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const tags = tagRepo.getAll();
      res.json(tags);
    }),
  );

  router.get(
    "/:name/notes",
    asyncHandler(async (req, res) => {
      const name = req.params.name as string;
      const tag = tagRepo.getByName(name);
      if (!tag) throw new NotFound("Tag not found");

      const noteIds = tagRepo.getNoteIdsForTag(tag.id);
      const notes = noteIds
        .map((id) => noteRepo.getById(id))
        .filter((n): n is NonNullable<typeof n> => n !== null);

      res.json(notes);
    }),
  );

  return router;
}
