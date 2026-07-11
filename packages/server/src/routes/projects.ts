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

  // ---- Labels ----

  router.get(
    "/:id/labels",
    asyncHandler(async (req, res) => {
      const labels = projectRepo.getLabelsForProject(req.params.id as string);
      res.json(labels);
    }),
  );

  router.post(
    "/:id/labels",
    asyncHandler(async (req, res) => {
      const { name, color } = req.body;
      if (!name) throw new BadRequest("name is required");
      const label = projectRepo.createLabel(req.params.id as string, {
        name,
        color,
      });
      res.status(201).json(label);
    }),
  );

  router.put(
    "/:id/labels/:labelId",
    asyncHandler(async (req, res) => {
      const { name, color } = req.body;
      const label = projectRepo.updateLabel(
        req.params.id as string,
        req.params.labelId as string,
        { name, color },
      );
      if (!label) throw new NotFound("Label not found");
      res.json(label);
    }),
  );

  router.delete(
    "/:id/labels/:labelId",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.deleteLabel(
        req.params.id as string,
        req.params.labelId as string,
      );
      if (!deleted) throw new NotFound("Label not found");
      res.status(204).end();
    }),
  );

  router.post(
    "/:id/cards/:cardId/labels/:labelId",
    asyncHandler(async (req, res) => {
      projectRepo.addLabelToCard(
        req.params.cardId as string,
        req.params.labelId as string,
      );
      res.status(204).end();
    }),
  );

  router.delete(
    "/:id/cards/:cardId/labels/:labelId",
    asyncHandler(async (req, res) => {
      projectRepo.removeLabelFromCard(
        req.params.cardId as string,
        req.params.labelId as string,
      );
      res.status(204).end();
    }),
  );

  // ---- Checklists ----

  router.get(
    "/:id/cards/:cardId/checklist",
    asyncHandler(async (req, res) => {
      const items = projectRepo.getChecklistItems(req.params.cardId as string);
      res.json(items);
    }),
  );

  router.post(
    "/:id/cards/:cardId/checklist",
    asyncHandler(async (req, res) => {
      const { text } = req.body;
      if (!text) throw new BadRequest("text is required");
      const item = projectRepo.addChecklistItem(req.params.cardId as string, {
        text,
      });
      res.status(201).json(item);
    }),
  );

  router.put(
    "/:id/cards/:cardId/checklist/:itemId",
    asyncHandler(async (req, res) => {
      const { text, done } = req.body;
      const item = projectRepo.updateChecklistItem(
        req.params.itemId as string,
        { text, done },
      );
      if (!item) throw new NotFound("Checklist item not found");
      res.json(item);
    }),
  );

  router.delete(
    "/:id/cards/:cardId/checklist/:itemId",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.deleteChecklistItem(
        req.params.itemId as string,
      );
      if (!deleted) throw new NotFound("Checklist item not found");
      res.status(204).end();
    }),
  );

  // ---- Comments ----

  router.get(
    "/:id/cards/:cardId/comments",
    asyncHandler(async (req, res) => {
      const comments = projectRepo.getCommentsForCard(
        req.params.cardId as string,
      );
      res.json(comments);
    }),
  );

  router.post(
    "/:id/cards/:cardId/comments",
    asyncHandler(async (req, res) => {
      const { body } = req.body;
      if (!body) throw new BadRequest("body is required");
      const comment = projectRepo.addComment(req.params.cardId as string, {
        body,
      });
      res.status(201).json(comment);
    }),
  );

  router.delete(
    "/:id/cards/:cardId/comments/:commentId",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.deleteComment(
        req.params.commentId as string,
      );
      if (!deleted) throw new NotFound("Comment not found");
      res.status(204).end();
    }),
  );

  // ---- Milestones ----

  router.get(
    "/:id/milestones",
    asyncHandler(async (req, res) => {
      const milestones = projectRepo.getMilestones(req.params.id as string);
      res.json(milestones);
    }),
  );

  router.post(
    "/:id/milestones",
    asyncHandler(async (req, res) => {
      const { title, description, dueDate } = req.body;
      if (!title) throw new BadRequest("title is required");
      const milestone = projectRepo.createMilestone(req.params.id as string, {
        title,
        description,
        dueDate,
      });
      res.status(201).json(milestone);
    }),
  );

  router.put(
    "/:id/milestones/:milestoneId",
    asyncHandler(async (req, res) => {
      const { title, description, dueDate, position } = req.body;
      const milestone = projectRepo.updateMilestone(
        req.params.id as string,
        req.params.milestoneId as string,
        { title, description, dueDate, position },
      );
      if (!milestone) throw new NotFound("Milestone not found");
      res.json(milestone);
    }),
  );

  router.delete(
    "/:id/milestones/:milestoneId",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.deleteMilestone(
        req.params.id as string,
        req.params.milestoneId as string,
      );
      if (!deleted) throw new NotFound("Milestone not found");
      res.status(204).end();
    }),
  );

  router.patch(
    "/:id/milestones/:milestoneId/toggle",
    asyncHandler(async (req, res) => {
      const { completed } = req.body;
      if (typeof completed !== "boolean") throw new BadRequest("completed (boolean) is required");
      const milestone = projectRepo.toggleMilestone(
        req.params.id as string,
        req.params.milestoneId as string,
        completed,
      );
      if (!milestone) throw new NotFound("Milestone not found");
      res.json(milestone);
    }),
  );

  router.post(
    "/:id/milestones/:milestoneId/cards",
    asyncHandler(async (req, res) => {
      const { cardIds } = req.body;
      if (!Array.isArray(cardIds) || cardIds.length === 0)
        throw new BadRequest("cardIds (non-empty array) is required");
      projectRepo.linkCardsToMilestone(
        req.params.milestoneId as string,
        cardIds,
      );
      res.status(201).json({ linked: cardIds.length });
    }),
  );

  router.delete(
    "/:id/milestones/:milestoneId/cards/:cardId",
    asyncHandler(async (req, res) => {
      const removed = projectRepo.unlinkCardFromMilestone(
        req.params.milestoneId as string,
        req.params.cardId as string,
      );
      if (!removed) throw new NotFound("Card not linked to milestone");
      res.status(204).end();
    }),
  );

  router.get(
    "/:id/milestones/:milestoneId/cards",
    asyncHandler(async (req, res) => {
      const cardIds = projectRepo.getCardsForMilestone(
        req.params.milestoneId as string,
      );
      res.json(cardIds);
    }),
  );

  // ---- Card Templates ----

  router.get(
    "/:id/card-templates",
    asyncHandler(async (req, res) => {
      const templates = projectRepo.getCardTemplates(req.params.id as string);
      res.json(templates);
    }),
  );

  router.post(
    "/:id/card-templates",
    asyncHandler(async (req, res) => {
      const { title, description, defaultLabels, defaultChecklist } = req.body;
      if (!title) throw new BadRequest("title is required");
      const template = projectRepo.createCardTemplate(req.params.id as string, {
        title,
        description,
        defaultLabels,
        defaultChecklist,
      });
      res.status(201).json(template);
    }),
  );

  router.put(
    "/:id/card-templates/:templateId",
    asyncHandler(async (req, res) => {
      const { title, description, defaultLabels, defaultChecklist } = req.body;
      const template = projectRepo.updateCardTemplate(
        req.params.id as string,
        req.params.templateId as string,
        { title, description, defaultLabels, defaultChecklist },
      );
      if (!template) throw new NotFound("Template not found");
      res.json(template);
    }),
  );

  router.delete(
    "/:id/card-templates/:templateId",
    asyncHandler(async (req, res) => {
      const deleted = projectRepo.deleteCardTemplate(
        req.params.id as string,
        req.params.templateId as string,
      );
      if (!deleted) throw new NotFound("Template not found");
      res.status(204).end();
    }),
  );

  return router;
}
