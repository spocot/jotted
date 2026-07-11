import { Router } from "express";
import type { TemplateRepository, NoteTemplateContent, ProjectTemplateContent, ProjectTemplateGroup } from "../db/template-repository.js";
import type { NoteRepository } from "../db/note-repository.js";
import type { ProjectRepository } from "../db/project-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";
import { v4 as uuid } from "uuid";

export function createTemplatesRouter(
  templateRepo: TemplateRepository,
  noteRepo: NoteRepository,
  projectRepo: ProjectRepository,
): Router {
  const router = Router();

  // List templates
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const type = req.query.type as string | undefined;
      if (type && type !== "note" && type !== "project") {
        throw new BadRequest('type must be "note" or "project"');
      }
      const templates = templateRepo.list(type as "note" | "project" | undefined);
      res.json(templates);
    }),
  );

  // Create template
  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { type, name, description, content } = req.body;
      if (!type || !["note", "project"].includes(type)) {
        throw new BadRequest('type must be "note" or "project"');
      }
      if (!name || typeof name !== "string") {
        throw new BadRequest("name is required");
      }
      let contentStr: string;
      if (typeof content === "string") {
        contentStr = content;
      } else {
        contentStr = JSON.stringify(content ?? {});
      }
      // Validate content JSON
      try {
        JSON.parse(contentStr);
      } catch {
        throw new BadRequest("content must be valid JSON");
      }
      const template = templateRepo.create({ type, name, description, content: contentStr });
      res.status(201).json(template);
    }),
  );

  // Get template by id
  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const template = templateRepo.getById(req.params.id as string);
      if (!template) throw new NotFound("Template not found");
      res.json(template);
    }),
  );

  // Update template
  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const { type, name, description, content } = req.body;
      if (type && !["note", "project"].includes(type)) {
        throw new BadRequest('type must be "note" or "project"');
      }
      if (content) {
        const contentStr = typeof content === "string" ? content : JSON.stringify(content);
        try {
          JSON.parse(contentStr);
        } catch {
          throw new BadRequest("content must be valid JSON");
        }
        const updated = templateRepo.update(req.params.id as string, { type, name, description, content: contentStr });
        if (!updated) throw new NotFound("Template not found");
        res.json(updated);
        return;
      }
      const updated = templateRepo.update(req.params.id as string, { type, name, description, content: JSON.stringify(content ?? {}) });
      if (!updated) throw new NotFound("Template not found");
      res.json(updated);
    }),
  );

  // Delete template
  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const deleted = templateRepo.delete(req.params.id as string);
      if (!deleted) throw new NotFound("Template not found");
      res.json({ success: true });
    }),
  );

  // Apply template — create note or project from template
  router.post(
    "/:id/apply",
    asyncHandler(async (req, res) => {
      const template = templateRepo.getById(req.params.id as string);
      if (!template) throw new NotFound("Template not found");
      const target = (req.query.target as string) || template.type;

      if (target === "note") {
        const content = JSON.parse(template.content) as NoteTemplateContent;
        const now = new Date().toISOString();
        const today = now.slice(0, 10);
        const title = (content.title || "Untitled")
          .replace(/\{\{date\}\}/g, today)
          .replace(/\{\{today\}\}/g, today)
          .replace(/\{\{title\}\}/g, content.title || "Untitled");
        const body = (content.body || "")
          .replace(/\{\{date\}\}/g, today)
          .replace(/\{\{today\}\}/g, today);
        const folder = content.folder || "/Unsorted";

        const note = noteRepo.create({ title, content: body, path: folder });
        if (!note) throw new NotFound("Failed to create note from template");

        if (content.tags && content.tags.length > 0) {
          const db = (noteRepo as any).db as import("better-sqlite3").Database;
          for (const tagName of content.tags) {
            const tagId = uuid();
            db.prepare("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)").run(tagId, tagName);
            const actualTag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName) as { id: string } | undefined;
            if (actualTag) {
              db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)").run(note.id, actualTag.id);
            }
          }
          // Re-fetch after tag mutation
          const enriched = noteRepo.getById(note.id);
          res.status(201).json(enriched ?? note);
          return;
        }

        res.status(201).json(note);
        return;
      }

      if (target === "project") {
        const content = JSON.parse(template.content) as ProjectTemplateContent;
        const groups = content.groups || [];
        const now = new Date().toISOString();
        const projectTitle = template.name + " (" + now.slice(0, 10) + ")";

        const project = projectRepo.create({ title: projectTitle, description: template.description });
        if (!project) throw new NotFound("Failed to create project from template");
        const projectId = project.id;

        for (const groupDef of groups) {
          const group = projectRepo.createGroup(projectId, { title: groupDef.name, description: "" });
          if (!group) continue;

          for (const colDef of groupDef.columns) {
            projectRepo.createColumn(group.id, { title: colDef.name });
          }

          if (groupDef.artifacts) {
            for (const artDef of groupDef.artifacts) {
              projectRepo.createArtifact(projectId, {
                groupId: group.id,
                title: artDef.name,
                artifactType: artDef.type ?? "note",
              });
            }
          }
        }

        const fullProject = projectRepo.getWithDetails(projectId);
        res.status(201).json(fullProject ?? project);
        return;
      }

      throw new BadRequest('target must be "note" or "project"');
    }),
  );

  return router;
}
