import { Router } from "express";
import type { TagRepository } from "../db/tag-repository.js";
import type { NoteRepository } from "../db/note-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { NotFound } from "../lib/errors.js";
import {
  clampLimit,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "../lib/pagination.js";

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

      const limit = clampLimit(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const result = tagRepo.getNotesForTag(tag.id, limit, offset);

      res.json(result);
    }),
  );

  router.put(
    "/:name",
    asyncHandler(async (req, res) => {
      const name = req.params.name as string;
      const tag = tagRepo.getByName(name);
      if (!tag) throw new NotFound("Tag not found");

      const { name: newName } = req.body;
      if (!newName || typeof newName !== "string" || !newName.trim()) {
        throw new NotFound("New name is required");
      }

      tagRepo.rename(tag.id, newName.trim());

      // Update tag references in note content — replace old #tag with new #tag
      const { getNotesForTag } = tagRepo;
      const notes = getNotesForTag(tag.id, 10000, 0).items;
      for (const note of notes) {
        const updatedContent = note.content.replace(
          new RegExp(`#${escapeRegex(name)}(?!\\w)`, "g"),
          `#${newName.trim()}`,
        );
        if (updatedContent !== note.content) {
          noteRepo.update(note.id, { content: updatedContent });
        }
      }

      res.json({ ...tag, name: newName.trim() });
    }),
  );

  router.delete(
    "/:name",
    asyncHandler(async (req, res) => {
      const name = req.params.name as string;
      const tag = tagRepo.getByName(name);
      if (!tag) throw new NotFound("Tag not found");

      tagRepo.deleteTag(tag.id);
      tagRepo.deleteUnused();
      res.status(204).end();
    }),
  );

  return router;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
