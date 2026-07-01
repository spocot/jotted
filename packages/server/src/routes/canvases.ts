import { Router } from "express";
import type { CanvasRepository } from "../db/canvas-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";

const VALID_ITEM_TYPES = [
  "text_box", "note_pin", "image",
  "rectangle", "rounded_rectangle", "circle", "diamond", "cylinder", "cloud", "hexagon",
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

  return router;
}
