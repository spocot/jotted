import { Router } from "express";
import type { NoteRepository } from "../db/note-repository.js";
import type { LinkRepository } from "../db/link-repository.js";
import type { TagRepository } from "../db/tag-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { NotFound } from "../lib/errors.js";
import {
  clampLimit,
  GRAPH_DEFAULT_LIMIT,
  GRAPH_MAX_LIMIT,
} from "../lib/pagination.js";

function attachTags(
  nodes: { id: string; title: string; path: string }[],
  tagRepo: TagRepository,
) {
  const tags = tagRepo.getTagsForNotes(nodes.map((n) => n.id));
  return nodes.map((n) => ({ ...n, tags: tags[n.id] ?? [] }));
}

export function createGraphRouter(
  noteRepo: NoteRepository,
  linkRepo: LinkRepository,
  tagRepo: TagRepository,
): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const limit = clampLimit(req.query.limit, GRAPH_DEFAULT_LIMIT, GRAPH_MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);

      const result = noteRepo.list({ limit, offset });
      const notes = result.items;

      const nodes = attachTags(
        notes.map((n) => ({ id: n.id, title: n.title, path: n.path })),
        tagRepo,
      );

      const nodeIds = new Set(notes.map((n) => n.id));
      const links = linkRepo.getAllLinks().filter(
        (l) => nodeIds.has(l.sourceId) && nodeIds.has(l.targetId),
      );

      res.json({
        nodes,
        links,
        total: result.total,
        hasMore: result.hasMore,
      });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const connectedLinks = linkRepo.getLinksForNote(id);
      const connectedIds = new Set<string>([note.id]);
      for (const link of connectedLinks) {
        connectedIds.add(link.sourceId);
        connectedIds.add(link.targetId);
      }

      const edges = connectedLinks;

      const nodes = attachTags(
        [...connectedIds]
          .map((nid) => noteRepo.getById(nid))
          .filter((n): n is NonNullable<typeof n> => n !== null)
          .map((n) => ({ id: n.id, title: n.title, path: n.path })),
        tagRepo,
      );

      res.json({ nodes, links: edges });
    }),
  );

  return router;
}
