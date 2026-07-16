import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest } from "../lib/errors.js";
import {
  loadConfig,
  saveConfig,
  clearConfig,
  setMasterPassword,
  isUnlocked,
  getStatus,
} from "../services/atlassian/atlassian-config.js";
import { testConnection, getIssue } from "../services/atlassian/jira-service.js";
import { resolvePage, getPageContent } from "../services/atlassian/confluence-service.js";
import { AtlassianAuthError, AtlassianNotFoundError } from "../services/atlassian/atlassian-client.js";
import type { AtlassianConfig } from "../services/atlassian/atlassian-config.js";

export function createIntegrationsRouter(): Router {
  const router = Router();

  router.get(
    "/atlassian/status",
    asyncHandler(async (_req, res) => {
      const status = await getStatus();
      let user: { user: string; displayName: string } | null = null;
      let connectionError: string | null = null;
      if (status.configured && status.unlocked) {
        try {
          user = await testConnection();
        } catch (err) {
          connectionError = err instanceof Error ? err.message : String(err);
        }
      }
      res.json({ ...status, user, connectionError });
    }),
  );

  router.post(
    "/atlassian/config",
    asyncHandler(async (req, res) => {
      const { domain, email, apiToken, masterPassword } = req.body ?? {};
      if (!domain || !email || !apiToken) {
        throw new BadRequest("domain, email, and apiToken are required");
      }

      // If a master password is provided, set it first so the config is encrypted
      if (masterPassword && typeof masterPassword === "string" && masterPassword.length > 0) {
        await setMasterPassword(masterPassword);
      }

      const config: AtlassianConfig = { domain, email, apiToken };
      await saveConfig(config);

      // Test the connection
      try {
        const user = await testConnection();
        res.json({
          message: "Atlassian integration configured successfully",
          user,
          encrypted: isUnlocked(),
        });
      } catch {
        res.json({
          message: "Configuration saved, but connection test failed. Check your credentials.",
          user: null,
          encrypted: isUnlocked(),
        });
      }
    }),
  );

  router.delete(
    "/atlassian/config",
    asyncHandler(async (_req, res) => {
      await clearConfig();
      res.json({ message: "Atlassian config cleared" });
    }),
  );

  router.post(
    "/atlassian/unlock",
    asyncHandler(async (req, res) => {
      const { masterPassword } = req.body ?? {};
      if (!masterPassword) {
        throw new BadRequest("masterPassword is required");
      }
      const hadConfig = await setMasterPassword(masterPassword);
      const unlocked = isUnlocked();
      res.json({
        message: hadConfig
          ? "Config unlocked successfully"
          : unlocked
            ? "Password set. Save config to encrypt it."
            : "Wrong password.",
        unlocked,
        hadConfig,
      });
    }),
  );

  router.get(
    "/jira/issues/:key",
    asyncHandler(async (req, res) => {
      const key = req.params.key as string;
      try {
        const issue = await getIssue(key);
        const config = await loadConfig();
        if (config) {
          issue.url = `https://${config.domain}/browse/${issue.key}`;
        }
        res.json(issue);
      } catch (err) {
        if (err instanceof AtlassianNotFoundError) {
          res.status(404).json({ error: `Jira issue "${key}" not found` });
          return;
        }
        if (err instanceof AtlassianAuthError) {
          res.status(401).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.get(
    "/confluence/pages/resolve",
    asyncHandler(async (req, res) => {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        throw new BadRequest("url query parameter is required");
      }
      try {
        const pageInfo = await resolvePage(url);
        res.json(pageInfo);
      } catch (err) {
        if (err instanceof AtlassianNotFoundError) {
          res.status(404).json({ error: "Confluence page not found" });
          return;
        }
        if (err instanceof AtlassianAuthError) {
          res.status(401).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  router.get(
    "/confluence/pages/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      try {
        const result = await getPageContent(id);
        res.json(result);
      } catch (err) {
        if (err instanceof AtlassianNotFoundError) {
          res.status(404).json({ error: `Confluence page "${id}" not found` });
          return;
        }
        if (err instanceof AtlassianAuthError) {
          res.status(401).json({ error: err.message });
          return;
        }
        throw err;
      }
    }),
  );

  return router;
}
