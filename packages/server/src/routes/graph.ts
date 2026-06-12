import { Router } from "express";
import type { NoteRepository } from "../db/note-repository.js";
import type { LinkRepository } from "../db/link-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { NotFound } from "../lib/errors.js";

export function createGraphRouter(
  noteRepo: NoteRepository,
  linkRepo: LinkRepository,
): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const notes = noteRepo.getAll();
      const links = linkRepo.getAllLinks();

      const nodes = notes.map((n) => ({
        id: n.id,
        title: n.title,
        path: n.path,
      }));

      res.json({ nodes, links });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const allLinks = linkRepo.getAllLinks();
      const connectedIds = new Set<string>([note.id]);

      for (const link of allLinks) {
        if (link.sourceId === note.id) connectedIds.add(link.targetId);
        if (link.targetId === note.id) connectedIds.add(link.sourceId);
      }

      const edges = allLinks.filter(
        (l) => connectedIds.has(l.sourceId) && connectedIds.has(l.targetId),
      );

      const nodes = [...connectedIds]
        .map((id) => noteRepo.getById(id))
        .filter((n): n is NonNullable<typeof n> => n !== null)
        .map((n) => ({ id: n.id, title: n.title, path: n.path }));

      res.json({ nodes, links: edges });
    }),
  );

  return router;
}
