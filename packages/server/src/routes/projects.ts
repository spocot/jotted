import { Router } from "express";
import type { ProjectRepository } from "../db/project-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";

const VALID_STATUSES = ["planning", "active", "completed", "archived"];
const VALID_ARTIFACT_TYPES = [
  "note", "canvas", "canvas_item", "image", "kanban_card", "external_link",
];

export function createProjectsRouter(projectRepo: ProjectRepository): Router {
  const router = Router();

  // ---- Projects ----

  router.get(
    "/",
    asyncHandler(async (_req, res) => {
      const projects = projectRepo.list();
      res.json(projects);
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { title, description, status, startDate, endDate } = req.body;
      if (status && !VALID_STATUSES.includes(status)) {
        throw new BadRequest(
          `status must be one of: ${VALID_STATUSES.join(", ")}`,
        );
      }
      const project = projectRepo.create({ title, description, status, startDate, endDate });
      res.status(201).json(project);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const project = projectRepo.getWithDetails(req.params.id as string);
      if (!project) throw new NotFound("Project not found");
      res.json(project);
    }),
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const { title, description, status, startDate, endDate } = req.body;
      if (status && !VALID_STATUSES.includes(status)) {
        throw new BadRequest(
          `status must be one of: ${VALID_STATUSES.join(", ")}`,
        );
      }
      const project = projectRepo.update(req.params.id as string, {
        title,
        description,
        status,
        startDate,
        endDate,
      });
      if (!project) throw new NotFound("Project not found");
      res.json(project);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.delete(req.params.id as string);
      if (!deleted) throw new NotFound("Project not found");
      res.status(204).end();
    }),
  );

  // ---- Groups ----

  router.get(
    "/:id/groups",
    asyncHandler(async (req, res) => {
      const groups = projectRepo.getGroups(req.params.id as string);
      res.json(groups);
    }),
  );

  router.post(
    "/:id/groups",
    asyncHandler(async (req, res) => {
      const { title, description } = req.body;
      const group = projectRepo.createGroup(req.params.id as string, {
        title,
        description,
      });
      if (!group) throw new NotFound("Project not found");
      res.status(201).json(group);
    }),
  );

  router.put(
    "/:id/groups/reorder",
    asyncHandler(async (req, res) => {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        throw new BadRequest("orderedIds must be an array");
      }
      const groups = projectRepo.reorderGroups(
        req.params.id as string,
        orderedIds,
      );
      res.json(groups);
    }),
  );

  router.put(
    "/:id/groups/:groupId",
    asyncHandler(async (req, res) => {
      const { title, description } = req.body;
      const group = projectRepo.updateGroup(
        req.params.id as string,
        req.params.groupId as string,
        { title, description },
      );
      if (!group) throw new NotFound("Group not found");
      res.json(group);
    }),
  );

  router.delete(
    "/:id/groups/:groupId",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.deleteGroup(
        req.params.id as string,
        req.params.groupId as string,
      );
      if (!deleted) throw new NotFound("Group not found");
      res.status(204).end();
    }),
  );

  // ---- Columns ----

  router.get(
    "/:id/groups/:groupId/columns",
    asyncHandler(async (req, res) => {
      const columns = projectRepo.getColumns(req.params.groupId as string);
      res.json(columns);
    }),
  );

  router.post(
    "/:id/groups/:groupId/columns",
    asyncHandler(async (req, res) => {
      const { title } = req.body;
      const column = projectRepo.createColumn(req.params.groupId as string, {
        title,
      });
      if (!column) throw new NotFound("Group not found");
      res.status(201).json(column);
    }),
  );

  router.put(
    "/:id/groups/:groupId/columns/reorder",
    asyncHandler(async (req, res) => {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        throw new BadRequest("orderedIds must be an array");
      }
      const columns = projectRepo.reorderColumns(
        req.params.groupId as string,
        orderedIds,
      );
      res.json(columns);
    }),
  );

  router.put(
    "/:id/groups/:groupId/columns/:columnId",
    asyncHandler(async (req, res) => {
      const { title } = req.body;
      const column = projectRepo.updateColumn(
        req.params.groupId as string,
        req.params.columnId as string,
        { title },
      );
      if (!column) throw new NotFound("Column not found");
      res.json(column);
    }),
  );

  router.delete(
    "/:id/groups/:groupId/columns/:columnId",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.deleteColumn(
        req.params.groupId as string,
        req.params.columnId as string,
      );
      if (!deleted) throw new NotFound("Column not found");
      res.status(204).end();
    }),
  );

  // ---- Cards ----

  router.get(
    "/:id/groups/:groupId/cards",
    asyncHandler(async (req, res) => {
      const cards = projectRepo.getGroupCards(req.params.groupId as string);
      res.json(cards);
    }),
  );

  router.post(
    "/:id/groups/:groupId/cards",
    asyncHandler(async (req, res) => {
      const { columnId, title, description, noteId, dueDate } = req.body;
      if (!columnId) throw new BadRequest("columnId is required");
      const card = projectRepo.createCard(columnId, {
        title,
        description,
        noteId,
        dueDate,
      });
      if (!card) throw new NotFound("Column not found");
      res.status(201).json(card);
    }),
  );

  router.put(
    "/:id/groups/:groupId/cards/:cardId",
    asyncHandler(async (req, res) => {
      const { title, description, noteId, dueDate } = req.body;
      const card = projectRepo.updateCard(req.params.cardId as string, {
        title,
        description,
        noteId,
        dueDate,
      });
      if (!card) throw new NotFound("Card not found");
      res.json(card);
    }),
  );

  router.put(
    "/:id/groups/:groupId/cards/:cardId/move",
    asyncHandler(async (req, res) => {
      const { targetColumnId, position } = req.body;
      if (!targetColumnId) throw new BadRequest("targetColumnId is required");
      const card = projectRepo.moveCard(
        req.params.cardId as string,
        targetColumnId,
        position,
      );
      if (!card) throw new NotFound("Card not found");
      res.json(card);
    }),
  );

  router.put(
    "/:id/groups/:groupId/cards/reorder/:columnId",
    asyncHandler(async (req, res) => {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) {
        throw new BadRequest("orderedIds must be an array");
      }
      const cards = projectRepo.reorderCards(
        req.params.columnId as string,
        orderedIds,
      );
      res.json(cards);
    }),
  );

  router.delete(
    "/:id/groups/:groupId/cards/:cardId",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.deleteCard(req.params.cardId as string);
      if (!deleted) throw new NotFound("Card not found");
      res.status(204).end();
    }),
  );

  // ---- Artifacts ----

  router.get(
    "/:id/artifacts",
    asyncHandler(async (req, res) => {
      const { groupId } = req.query;
      if (groupId) {
        const artifacts = projectRepo.getGroupArtifacts(groupId as string);
        res.json(artifacts);
      } else {
        const artifacts = projectRepo.getGlobalArtifacts(
          req.params.id as string,
        );
        res.json(artifacts);
      }
    }),
  );

  router.post(
    "/:id/artifacts",
    asyncHandler(async (req, res) => {
      const {
        groupId,
        title,
        description,
        artifactType,
        referenceId,
        referenceUrl,
      } = req.body;
      if (artifactType && !VALID_ARTIFACT_TYPES.includes(artifactType)) {
        throw new BadRequest(
          `artifactType must be one of: ${VALID_ARTIFACT_TYPES.join(", ")}`,
        );
      }
      const artifact = projectRepo.createArtifact(req.params.id as string, {
        groupId,
        title,
        description,
        artifactType,
        referenceId,
        referenceUrl,
      });
      if (!artifact) throw new NotFound("Project not found");
      res.status(201).json(artifact);
    }),
  );

  router.put(
    "/:id/artifacts/:artifactId",
    asyncHandler(async (req, res) => {
      const { title, description, artifactType, referenceId, referenceUrl } =
        req.body;
      if (artifactType && !VALID_ARTIFACT_TYPES.includes(artifactType)) {
        throw new BadRequest(
          `artifactType must be one of: ${VALID_ARTIFACT_TYPES.join(", ")}`,
        );
      }
      const artifact = projectRepo.updateArtifact(
        req.params.id as string,
        req.params.artifactId as string,
        { title, description, artifactType, referenceId, referenceUrl },
      );
      if (!artifact) throw new NotFound("Artifact not found");
      res.json(artifact);
    }),
  );

  router.delete(
    "/:id/artifacts/:artifactId",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.deleteArtifact(
        req.params.id as string,
        req.params.artifactId as string,
      );
      if (!deleted) throw new NotFound("Artifact not found");
      res.status(204).end();
    }),
  );

  return router;
}
