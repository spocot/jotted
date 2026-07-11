import { Router } from "express";
import type { CanvasRepository } from "../db/canvas-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";
import { v4 as uuid } from "uuid";

const VALID_ITEM_TYPES = [
  "text_box", "note_pin", "image",
  "rectangle", "rounded_rectangle", "circle", "diamond", "cylinder", "cloud", "hexagon", "group",
];

export function createCanvasesRouter(canvasRepo: CanvasRepository): Router {
  const router = Router();

  // List all canvases
  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const canvases = canvasRepo.list();
      res.json(canvases);
    }),
  );

  // Create a new canvas
  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { title } = req.body;
      if (title !== undefined && (typeof title !== "string" || title.length > 200)) {
        throw new BadRequest("title must be a string (max 200 chars)");
      }
      const canvas = canvasRepo.create(title);
      res.status(201).json(canvas);
    }),
  );

  // Get canvas with items and edges
  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const canvas = canvasRepo.getWithDetails(req.params.id as string);
      if (!canvas) throw new NotFound("Canvas not found");
      res.json(canvas);
    }),
  );

  // Update canvas title
  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const { title } = req.body;
      if (typeof title !== "string" || title.length > 200) {
        throw new BadRequest("title must be a string (max 200 chars)");
      }
      const canvas = canvasRepo.update(req.params.id as string, title);
      if (!canvas) throw new NotFound("Canvas not found");
      res.json(canvas);
    }),
  );

  // Delete canvas
  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const deleted = canvasRepo.delete(req.params.id as string);
      if (!deleted) throw new NotFound("Canvas not found");
      res.status(204).end();
    }),
  );

  // ---- Items ----

  // Add item to canvas
  router.post(
    "/:id/items",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const { noteId, type, text, color, x, y, width, height } = req.body;
      if (type && !VALID_ITEM_TYPES.includes(type)) {
        throw new BadRequest("type must be valid");
      }
      const item = canvasRepo.addItem(canvasId, {
        noteId,
        type,
        text,
        color,
        x: x !== undefined ? Number(x) : undefined,
        y: y !== undefined ? Number(y) : undefined,
        width: width !== undefined ? Number(width) : undefined,
        height: height !== undefined ? Number(height) : undefined,
      });
      if (!item) throw new NotFound("Canvas not found");
      res.status(201).json(item);
    }),
  );

  // Update item
  router.put(
    "/:id/items/:itemId",
    asyncHandler(async (req, res) => {
      const { canvasId, itemId } = { canvasId: req.params.id as string, itemId: req.params.itemId as string };
      const { noteId, type, text, color, x, y, width, height, zIndex } = req.body;
      if (type && !VALID_ITEM_TYPES.includes(type)) {
        throw new BadRequest("type must be valid");
      }
      const item = canvasRepo.updateItem(canvasId, itemId, {
        noteId,
        type,
        text,
        color,
        x: x !== undefined ? Number(x) : undefined,
        y: y !== undefined ? Number(y) : undefined,
        width: width !== undefined ? Number(width) : undefined,
        height: height !== undefined ? Number(height) : undefined,
        zIndex: zIndex !== undefined ? Number(zIndex) : undefined,
      });
      if (!item) throw new NotFound("Item not found");
      res.json(item);
    }),
  );

  // Delete item
  router.delete(
    "/:id/items/:itemId",
    asyncHandler(async (req, res) => {
      const { canvasId, itemId } = { canvasId: req.params.id as string, itemId: req.params.itemId as string };
      const deleted = canvasRepo.deleteItem(canvasId, itemId);
      if (!deleted) throw new NotFound("Item not found");
      res.status(204).end();
    }),
  );

  // Batch update items (auto-save)
  router.put(
    "/:id/batch",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const { items, edges, deletedItemIds, deletedEdgeIds } = req.body;
      const result = canvasRepo.batchUpdate(canvasId, {
        items,
        edges,
        deletedItemIds,
        deletedEdgeIds,
      });
      if (!result) throw new NotFound("Canvas not found");
      res.json(result);
    }),
  );

  // ---- Groups ----

  // Create group
  router.post(
    "/:id/groups",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const { groupId, label } = req.body;
      if (!groupId || typeof groupId !== "string") {
        throw new BadRequest("groupId is required");
      }
      canvasRepo.createGroup(canvasId, groupId, label);
      res.status(201).json({ id: groupId, canvasId, label: label ?? "", createdAt: new Date().toISOString() });
    }),
  );

  // Delete group
  router.delete(
    "/:id/groups/:groupId",
    asyncHandler(async (req, res) => {
      const { canvasId, groupId } = { canvasId: req.params.id as string, groupId: req.params.groupId as string };
      canvasRepo.deleteGroup(groupId);
      res.status(204).end();
    }),
  );

  // List groups for canvas
  router.get(
    "/:id/groups",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const groups = canvasRepo.getGroupsByCanvas(canvasId);
      res.json(groups);
    }),
  );

  // ---- Versions ----

  // Create version (snapshot)
  router.post(
    "/:id/versions",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const { title, description, items, edges, thumbnail } = req.body;
      if (!title || typeof title !== "string") {
        throw new BadRequest("title is required");
      }
      if (!Array.isArray(items) || !Array.isArray(edges)) {
        throw new BadRequest("items and edges arrays are required");
      }
      const version = canvasRepo.createVersion(canvasId, title, description ?? "", items, edges, thumbnail);
      res.status(201).json(version);
    }),
  );

  // Delete version
  router.delete(
    "/:id/versions/:versionId",
    asyncHandler(async (req, res) => {
      const { canvasId, versionId } = { canvasId: req.params.id as string, versionId: req.params.versionId as string };
      const deleted = canvasRepo.deleteVersion(versionId);
      if (!deleted) throw new NotFound("Version not found");
      res.status(204).end();
    }),
  );

  // List versions for canvas
  router.get(
    "/:id/versions",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const versions = canvasRepo.getVersionsByCanvas(canvasId);
      res.json(versions);
    }),
  );

  // Get single version
  router.get(
    "/:id/versions/:versionId",
    asyncHandler(async (req, res) => {
      const { versionId } = { versionId: req.params.versionId as string };
      const version = canvasRepo.getVersionById(versionId);
      if (!version) throw new NotFound("Version not found");
      res.json(version);
    }),
  );

  // Restore version
  router.post(
    "/:id/versions/:versionId/restore",
    asyncHandler(async (req, res) => {
      const { canvasId, versionId } = { canvasId: req.params.id as string, versionId: req.params.versionId as string };
      const version = canvasRepo.getVersionById(versionId);
      if (!version) throw new NotFound("Version not found");
      const result = canvasRepo.batchUpdate(canvasId, {
        items: version.items as any,
        edges: version.edges as any,
      });
      if (!result) throw new NotFound("Canvas not found");
      res.json(result);
    }),
  );

  // ---- Edges ----

  // Add edge
  router.post(
    "/:id/edges",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const { sourceItemId, targetItemId, type, label, edgeStyle, arrowStart, arrowEnd } = req.body;
      if (!sourceItemId || !targetItemId) {
        throw new BadRequest("sourceItemId and targetItemId are required");
      }
      if (type && !["straight", "curved"].includes(type)) {
        throw new BadRequest("type must be one of: straight, curved");
      }
      if (edgeStyle && !["solid", "dashed", "dotted"].includes(edgeStyle)) {
        throw new BadRequest("edgeStyle must be one of: solid, dashed, dotted");
      }
      const edge = canvasRepo.addEdge(canvasId, { sourceItemId, targetItemId, type, label, edgeStyle, arrowStart, arrowEnd });
      if (!edge) throw new NotFound("Canvas not found");
      res.status(201).json(edge);
    }),
  );

  // Update edge
  router.put(
    "/:id/edges/:edgeId",
    asyncHandler(async (req, res) => {
      const { canvasId, edgeId } = { canvasId: req.params.id as string, edgeId: req.params.edgeId as string };
      const { sourceItemId, targetItemId, type, label, edgeStyle, arrowStart, arrowEnd } = req.body;
      if (type && !["straight", "curved"].includes(type)) {
        throw new BadRequest("type must be one of: straight, curved");
      }
      if (edgeStyle && !["solid", "dashed", "dotted"].includes(edgeStyle)) {
        throw new BadRequest("edgeStyle must be one of: solid, dashed, dotted");
      }
      const edge = canvasRepo.updateEdge(canvasId, edgeId, { sourceItemId, targetItemId, type, label, edgeStyle, arrowStart, arrowEnd });
      if (!edge) throw new NotFound("Edge not found");
      res.json(edge);
    }),
  );

  // Delete edge
  router.delete(
    "/:id/edges/:edgeId",
    asyncHandler(async (req, res) => {
      const { canvasId, edgeId } = { canvasId: req.params.id as string, edgeId: req.params.edgeId as string };
      const deleted = canvasRepo.deleteEdge(canvasId, edgeId);
      if (!deleted) throw new NotFound("Edge not found");
      res.status(204).end();
    }),
  );

  // ---- Groups ----

  // Group selected items
  router.post(
    "/:id/groups",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const { itemIds, label } = req.body;
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length < 2) {
        throw new BadRequest("itemIds array with at least 2 items is required");
      }
      const groupId = uuid();
      const now = new Date().toISOString();
      canvasRepo.db.prepare("INSERT INTO canvas_groups (id, canvas_id, label, created_at) VALUES (?, ?, ?, ?)").run(groupId, canvasId, label ?? "", now);
      const updateStmt = canvasRepo.db.prepare("UPDATE canvas_items SET group_id = ? WHERE id = ? AND canvas_id = ?");
      for (const itemId of itemIds) {
        updateStmt.run(groupId, itemId, canvasId);
      }
      res.status(201).json({ id: groupId, canvasId, label: label ?? "", createdAt: now });
    }),
  );

  // Ungroup
  router.delete(
    "/:id/groups/:groupId",
    asyncHandler(async (req, res) => {
      const { canvasId, groupId } = { canvasId: req.params.id as string, groupId: req.params.groupId as string };
      canvasRepo.db.prepare("UPDATE canvas_items SET group_id = NULL WHERE group_id = ? AND canvas_id = ?").run(groupId, canvasId);
      canvasRepo.db.prepare("DELETE FROM canvas_groups WHERE id = ? AND canvas_id = ?").run(groupId, canvasId);
      res.status(204).end();
    }),
  );

  // List groups
  router.get(
    "/:id/groups",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const groups = canvasRepo.db.prepare("SELECT id, canvas_id AS canvasId, label, created_at AS createdAt FROM canvas_groups WHERE canvas_id = ?").all(canvasId);
      res.json(groups);
    }),
  );

  // ---- Versions ----

  // Create version snapshot
  router.post(
    "/:id/versions",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const { title, description, items, edges, thumbnail } = req.body;
      if (!items || !edges) {
        throw new BadRequest("items and edges are required");
      }
      const id = uuid();
      const now = new Date().toISOString();
      canvasRepo.db.prepare("INSERT INTO canvas_versions (id, canvas_id, title, description, items, edges, thumbnail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(id, canvasId, title ?? `Version ${now}`, description ?? "", JSON.stringify(items), JSON.stringify(edges), thumbnail ?? null, now);
      res.status(201).json({ id, canvasId, title: title ?? `Version ${now}`, description: description ?? "", thumbnail, createdAt: now });
    }),
  );

  // List versions
  router.get(
    "/:id/versions",
    asyncHandler(async (req, res) => {
      const canvasId = req.params.id as string;
      const versions = canvasRepo.db.prepare("SELECT id, canvas_id AS canvasId, title, description, items, edges, thumbnail, created_at AS createdAt FROM canvas_versions WHERE canvas_id = ? ORDER BY created_at DESC").all(canvasId) as any[];
      const parsed = versions.map((v) => ({
        ...v,
        items: JSON.parse(v.items),
        edges: JSON.parse(v.edges),
      }));
      res.json(parsed);
    }),
  );

  // Get version
  router.get(
    "/:id/versions/:versionId",
    asyncHandler(async (req, res) => {
      const { canvasId, versionId } = { canvasId: req.params.id as string, versionId: req.params.versionId as string };
      const version = canvasRepo.db.prepare("SELECT id, canvas_id AS canvasId, title, description, items, edges, thumbnail, created_at AS createdAt FROM canvas_versions WHERE id = ? AND canvas_id = ?").get(versionId, canvasId) as any;
      if (!version) throw new NotFound("Version not found");
      res.json({ ...version, items: JSON.parse(version.items), edges: JSON.parse(version.edges) });
    }),
  );

  // Restore version
  router.post(
    "/:id/versions/:versionId/restore",
    asyncHandler(async (req, res) => {
      const { canvasId, versionId } = { canvasId: req.params.id as string, versionId: req.params.versionId as string };
      const version = canvasRepo.db.prepare("SELECT items, edges FROM canvas_versions WHERE id = ? AND canvas_id = ?").get(versionId, canvasId) as any;
      if (!version) throw new NotFound("Version not found");
      const items = JSON.parse(version.items);
      const edges = JSON.parse(version.edges);
      const result = canvasRepo.batchUpdate(canvasId, { items, edges });
      if (!result) throw new NotFound("Canvas not found");
      res.json(result);
    }),
  );

  // Delete version
  router.delete(
    "/:id/versions/:versionId",
    asyncHandler(async (req, res) => {
      const { canvasId, versionId } = { canvasId: req.params.id as string, versionId: req.params.versionId as string };
      const deleted = canvasRepo.db.prepare("DELETE FROM canvas_versions WHERE id = ? AND canvas_id = ?").run(versionId, canvasId);
      if (deleted.changes === 0) throw new NotFound("Version not found");
      res.status(204).end();
    }),
  );

  return router;
}
