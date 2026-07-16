import { Router } from "express";
import type { SmartFolderRepository } from "../db/smart-folder-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";

export function createSmartFoldersRouter(repo: SmartFolderRepository): Router {
  const router = Router();

  router.get("/", asyncHandler(async (_req, res) => {
    res.json(repo.list());
  }));

  router.post("/", asyncHandler(async (req, res) => {
    const { name, queryJson } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new BadRequest("name is required");
    }
    const folder = repo.create({ name: name.trim(), queryJson });
    res.status(201).json(folder);
  }));

  router.get("/:id", asyncHandler(async (req, res) => {
    const folder = repo.getById(req.params.id as string);
    if (!folder) throw new NotFound("Smart folder not found");
    res.json(folder);
  }));

  router.put("/:id", asyncHandler(async (req, res) => {
    const { name, queryJson } = req.body;
    const updated = repo.update(req.params.id as string, { name, queryJson });
    if (!updated) throw new NotFound("Smart folder not found");
    res.json(updated);
  }));

  router.delete("/:id", asyncHandler(async (req, res) => {
    const deleted = repo.delete(req.params.id as string);
    if (!deleted) throw new NotFound("Smart folder not found");
    res.status(204).end();
  }));

  return router;
}
