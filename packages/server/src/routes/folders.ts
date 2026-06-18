import { Router } from "express";
import type { NoteRepository } from "../db/note-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";

export interface FolderNode {
  name: string;
  path: string;
  noteCount: number;
  children: FolderNode[];
}

function buildTree(paths: { path: string; count: number }[]): FolderNode[] {
  const root: FolderNode[] = [];

  for (const { path, count } of paths) {
    if (path === "/") continue;
    const parts = path.replace(/^\/|\/$/g, "").split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const segment = parts[i];
      const parentPath = "/" + parts.slice(0, i + 1).join("/");
      let existing = current.find((n) => n.name === segment);

      if (!existing) {
        existing = { name: segment, path: parentPath, noteCount: 0, children: [] };
        current.push(existing);
      }

      if (i === parts.length - 1) {
        existing.noteCount += count;
      }

      current = existing.children;
    }
  }

  // Sum child notes into each folder's noteCount
  function sumChildren(nodes: FolderNode[]): number {
    let total = 0;
    for (const node of nodes) {
      const childSum = sumChildren(node.children);
      node.noteCount += childSum;
      total += node.noteCount;
    }
    return total;
  }

  sumChildren(root);
  return root;
}

export function createFoldersRouter(
  noteRepo: NoteRepository,
): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const pathCounts = noteRepo.getPathsWithCounts();

      // Expand implicit parent folders: if a note is at /projects/foo, ensure /projects exists
      const allPaths = new Set(pathCounts.map((p) => p.path));
      for (const { path } of pathCounts) {
        if (path === "/") continue;
        const parts = path.replace(/^\/|\/$/g, "").split("/");
        for (let i = 1; i < parts.length; i++) {
          allPaths.add("/" + parts.slice(0, i).join("/"));
        }
      }

      const entries = [...allPaths].map((path) => ({
        path,
        count: pathCounts.find((p) => p.path === path)?.count ?? 0,
      }));

      const tree = buildTree(entries);
      res.json(tree);
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { path } = req.body;
      if (typeof path !== "string" || !path.startsWith("/") || path === "/") {
        throw new BadRequest("Valid folder path is required");
      }

      // Folder creation is implicit — just return success.
      // Notes can be moved into it via PUT /api/notes/:id.
      res.status(201).json({ path });
    }),
  );

  router.put(
    "/rename",
    asyncHandler(async (req, res) => {
      const { oldPath, newPath } = req.body;
      if (typeof oldPath !== "string" || typeof newPath !== "string") {
        throw new BadRequest("oldPath and newPath are required");
      }
      if (oldPath === "/" || newPath === "/") {
        throw new BadRequest("Cannot rename root folder");
      }

      const notes = noteRepo.getIdsAndPathsByPathPrefix(oldPath);
      let moved = 0;

      for (const note of notes) {
        const suffix = note.path.slice(oldPath.length);
        const updatedPath = newPath + suffix;
        noteRepo.update(note.id, { path: updatedPath });
        moved++;
      }

      if (moved === 0) throw new NotFound("No notes found in that folder");

      res.json({ moved });
    }),
  );

  router.delete(
    "/",
    asyncHandler(async (req, res) => {
      const { path } = req.query;
      if (typeof path !== "string" || path === "/") {
        throw new BadRequest("Valid folder path is required");
      }

      const notes = noteRepo.getIdsAndPathsByPathPrefix(path);
      let moved = 0;

      for (const note of notes) {
        const suffix = note.path.slice(path.length);
        const parentPath = path.split("/").slice(0, -1).join("/") || "/";
        const updatedPath = parentPath + suffix;
        noteRepo.update(note.id, { path: updatedPath });
        moved++;
      }

      res.json({ moved });
    }),
  );

  return router;
}
