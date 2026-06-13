import { Router } from "express";
import type { TagRepository } from "../db/tag-repository.js";
import type { NoteRepository } from "../db/note-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

  router.put(
    "/:name",
    asyncHandler(async (req, res) => {
      const oldName = req.params.name as string;
      const { name: newName } = req.body;

      if (!newName || typeof newName !== "string" || !newName.trim()) {
        throw new BadRequest("New tag name is required");
      }

      const tag = tagRepo.getByName(oldName);
      if (!tag) throw new NotFound("Tag not found");

      const existing = tagRepo.getByName(newName.trim());
      if (existing && existing.id !== tag.id) {
        throw new BadRequest("A tag with that name already exists");
      }

      tagRepo.rename(tag.id, newName.trim());

      // Rewrite #oldName → #newName in all affected notes' content
      const noteIds = tagRepo.getNoteIdsForTag(tag.id);
      const oldTagRegex = new RegExp(
        `(?<=^|\\s)#${escapeRegex(oldName)}(?=[\\s.,;:!?]|$)`,
        "g",
      );

      for (const noteId of noteIds) {
        const note = noteRepo.getById(noteId);
        if (!note) continue;

        const newContent = note.content.replace(oldTagRegex, `#${newName.trim()}`);
        if (newContent !== note.content) {
          noteRepo.update(noteId, { content: newContent });
        }
      }

      const updated = tagRepo.getById(tag.id);
      res.json(updated);
    }),
  );

  router.delete(
    "/:name",
    asyncHandler(async (req, res) => {
      const name = req.params.name as string;
      const tag = tagRepo.getByName(name);
      if (!tag) throw new NotFound("Tag not found");

      tagRepo.deleteTag(tag.id);
      res.status(204).end();
    }),
  );

  return router;
}
