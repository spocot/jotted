import { Router } from "express";
import type { IntegrationLinkRepository } from "../db/integration-link-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";
import { getIssue } from "../services/atlassian/jira-service.js";
import { resolvePage } from "../services/atlassian/confluence-service.js";
import { loadConfig } from "../services/atlassian/atlassian-config.js";

export function createIntegrationLinksRouter(
  linkRepo: IntegrationLinkRepository,
): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { entity_type, entity_id } = req.query;
      if (!entity_type || typeof entity_type !== "string" || !entity_id || typeof entity_id !== "string") {
        throw new BadRequest("entity_type and entity_id query params are required");
      }
      const links = linkRepo.getByEntity(entity_type, entity_id);
      res.json(links);
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { entityType, entityId, integrationType, externalId } = req.body ?? {};
      if (!entityType || !entityId || !integrationType || !externalId) {
        throw new BadRequest("entityType, entityId, integrationType, and externalId are required");
      }

      let externalUrl = "";
      let title: string | undefined;
      let metaJson: string | undefined;

      if (integrationType === "jira") {
        const issue = await getIssue(externalId);
        const config = await loadConfig();
        externalUrl = config
          ? `https://${config.domain}/browse/${issue.key}`
          : issue.url;
        title = `${issue.key}: ${issue.summary}`;
        metaJson = JSON.stringify({
          status: issue.status,
          statusColor: issue.statusColor,
          assignee: issue.assignee,
          priority: issue.priority,
          issueType: issue.issueType,
        });
      } else if (integrationType === "confluence") {
        const pageInfo = await resolvePage(externalId);
        externalUrl = pageInfo.url;
        title = pageInfo.title;
        metaJson = JSON.stringify({
          spaceKey: pageInfo.spaceKey,
          spaceName: pageInfo.spaceName,
        });
      }

      const link = linkRepo.create({
        entityType,
        entityId,
        integrationType,
        externalId,
        externalUrl,
        title,
        metaJson,
      });
      res.status(201).json(link);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const deleted = linkRepo.delete(req.params.id as string);
      if (!deleted) {
        throw new NotFound("Integration link not found");
      }
      res.status(204).end();
    }),
  );

  router.post(
    "/:id/refresh",
    asyncHandler(async (req, res) => {
      const link = linkRepo.getById(req.params.id as string);
      if (!link) {
        throw new NotFound("Integration link not found");
      }

      let title: string | undefined;
      let metaJson: string | undefined;
      let externalUrl: string | undefined;

      if (link.integrationType === "jira") {
        const issue = await getIssue(link.externalId);
        const config = await loadConfig();
        externalUrl = config
          ? `https://${config.domain}/browse/${issue.key}`
          : issue.url;
        title = `${issue.key}: ${issue.summary}`;
        metaJson = JSON.stringify({
          status: issue.status,
          statusColor: issue.statusColor,
          assignee: issue.assignee,
          priority: issue.priority,
          issueType: issue.issueType,
        });
      } else if (link.integrationType === "confluence") {
        const pageInfo = await resolvePage(link.externalId);
        externalUrl = pageInfo.url;
        title = pageInfo.title;
        metaJson = JSON.stringify({
          spaceKey: pageInfo.spaceKey,
          spaceName: pageInfo.spaceName,
        });
      }

      const updated = linkRepo.updateMeta(req.params.id as string, {
        title,
        metaJson,
        externalUrl,
      });
      res.json(updated);
    }),
  );

  return router;
}
