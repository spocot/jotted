import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import { getDb } from "./db/index.js";
import { NoteRepository } from "./db/note-repository.js";
import { TagRepository } from "./db/tag-repository.js";
import { LinkRepository } from "./db/link-repository.js";
import { VersionRepository } from "./db/version-repository.js";
import { CanvasRepository } from "./db/canvas-repository.js";
import { ProjectRepository } from "./db/project-repository.js";
import { TemplateRepository } from "./db/template-repository.js";
import type { Template } from "./db/template-repository.js";
import { createNotesRouter } from "./routes/notes.js";
import { createCanvasesRouter } from "./routes/canvases.js";
import { createTagsRouter } from "./routes/tags.js";
import { createSearchRouter } from "./routes/search.js";
import { createGraphRouter } from "./routes/graph.js";
import { createFoldersRouter } from "./routes/folders.js";
import { createVersionsRouter } from "./routes/versions.js";
import { createUploadsRouter } from "./routes/uploads.js";
import { createCalendarRouter } from "./routes/calendar.js";
import { createOutlookRouter } from "./routes/outlook.js";
import { createProjectsRouter } from "./routes/projects.js";
import { createTemplatesRouter } from "./routes/templates.js";
import { AppError } from "./lib/errors.js";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import type { Request, Response, NextFunction } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const app = express();

app.use(cors());
app.use(express.json());
const UPLOADS_DIR_STATIC = process.env.UPLOADS_DIR || join(__dirname, "../uploads");
app.use("/uploads", express.static(UPLOADS_DIR_STATIC));

const db = getDb();
const noteRepo = new NoteRepository(db);
const tagRepo = new TagRepository(db);
const linkRepo = new LinkRepository(db);
const versionRepo = new VersionRepository(db);
const canvasRepo = new CanvasRepository(db);
const projectRepo = new ProjectRepository(db);
const templateRepo = new TemplateRepository(db);
seedBuiltInTemplates(templateRepo);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/notes", createNotesRouter(noteRepo, tagRepo, linkRepo, versionRepo));
app.use("/api/canvases", createCanvasesRouter(canvasRepo));
app.use("/api/notes", createVersionsRouter(noteRepo, tagRepo, linkRepo, versionRepo));
app.use("/api/tags", createTagsRouter(tagRepo, noteRepo));
app.use("/api/search", createSearchRouter(db, noteRepo, tagRepo));
app.use("/api/graph", createGraphRouter(noteRepo, linkRepo, tagRepo));
app.use("/api/folders", createFoldersRouter(noteRepo));
app.use("/api/uploads", createUploadsRouter(db));
app.use("/api/calendar", createCalendarRouter(noteRepo));
app.use("/api/calendar/outlook", createOutlookRouter());
app.use("/api/projects", createProjectsRouter(projectRepo));
app.use("/api/templates", createTemplatesRouter(templateRepo, noteRepo, projectRepo, tagRepo));

function seedBuiltInTemplates(repo: TemplateRepository): void {
  const existing = repo.list();
  const existingNames = new Set(existing.map((t) => t.name));

  const noteTemplates: Array<{ name: string; description: string; content: object }> = [
    {
      name: "Daily Note",
      description: "A daily journal note with tasks and notes sections",
      content: {
        title: "{{date}}",
        body: "# {{date}}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n",
        tags: ["daily"],
        folder: "/Journal",
      },
    },
    {
      name: "Meeting Notes",
      description: "Structured notes for meetings with attendees and action items",
      content: {
        title: "Meeting: {{title}}",
        body: "# Meeting: {{title}}\n\n## Attendees\n\n- \n\n## Agenda\n\n1. \n\n## Action Items\n\n- [ ] \n\n## Notes\n\n",
        tags: ["meeting"],
        folder: "/Meetings",
      },
    },
    {
      name: "To-Do",
      description: "Simple to-do list with progress tracking",
      content: {
        title: "To-Do: {{title}}",
        body: "# To-Do: {{title}}\n\n## To-Do\n\n- [ ] \n\n## In Progress\n\n- [ ] \n\n## Done\n\n- [ ] \n\n",
        tags: ["todo"],
        folder: "/Tasks",
      },
    },
  ];

  const projectTemplates: Array<{ name: string; description: string; content: object }> = [
    {
      name: "Software Project",
      description: "Standard software development project with Dev, QA, and Docs tracks",
      content: {
        groups: [
          {
            name: "Development",
            columns: [
              { name: "Backlog", color: "#94a3b8" },
              { name: "Ready", color: "#3b82f6" },
              { name: "In Progress", color: "#f59e0b" },
              { name: "Review", color: "#8b5cf6" },
              { name: "Done", color: "#22c55e" },
            ],
            artifacts: [
              { name: "Architecture Decision Record", type: "note" },
              { name: "API Specification", type: "note" },
              { name: "System Diagram", type: "note" },
            ],
          },
          {
            name: "QA",
            columns: [
              { name: "Test Plan", color: "#94a3b8" },
              { name: "In Progress", color: "#f59e0b" },
              { name: "Passed", color: "#22c55e" },
              { name: "Failed", color: "#ef4444" },
            ],
            artifacts: [
              { name: "Test Strategy", type: "note" },
              { name: "Test Cases", type: "note" },
            ],
          },
          {
            name: "Documentation",
            columns: [
              { name: "To Write", color: "#94a3b8" },
              { name: "Drafting", color: "#f59e0b" },
              { name: "Review", color: "#8b5cf6" },
              { name: "Published", color: "#22c55e" },
            ],
            artifacts: [
              { name: "User Guide", type: "note" },
              { name: "Developer Guide", type: "note" },
              { name: "Release Notes", type: "note" },
            ],
          },
        ],
      },
    },
    {
      name: "Marketing Campaign",
      description: "Coordinate marketing efforts across creative, social, and analytics",
      content: {
        groups: [
          {
            name: "Creative",
            columns: [
              { name: "Ideas", color: "#94a3b8" },
              { name: "In Production", color: "#f59e0b" },
              { name: "Review", color: "#8b5cf6" },
              { name: "Approved", color: "#22c55e" },
            ],
            artifacts: [
              { name: "Brand Guidelines", type: "note" },
              { name: "Campaign Brief", type: "note" },
            ],
          },
          {
            name: "Social Media",
            columns: [
              { name: "Planned", color: "#94a3b8" },
              { name: "Scheduled", color: "#3b82f6" },
              { name: "Live", color: "#22c55e" },
              { name: "Archived", color: "#64748b" },
            ],
            artifacts: [
              { name: "Content Calendar", type: "note" },
              { name: "Platform Guidelines", type: "note" },
            ],
          },
          {
            name: "Analytics",
            columns: [
              { name: "Metrics to Track", color: "#94a3b8" },
              { name: "Tracking", color: "#f59e0b" },
              { name: "Reported", color: "#22c55e" },
            ],
            artifacts: [
              { name: "KPI Dashboard", type: "note" },
              { name: "Weekly Report Template", type: "note" },
            ],
          },
        ],
      },
    },
    {
      name: "Research Project",
      description: "Organize literature review, experiments, and publications",
      content: {
        groups: [
          {
            name: "Literature Review",
            columns: [
              { name: "To Read", color: "#94a3b8" },
              { name: "Reading", color: "#f59e0b" },
              { name: "Summarized", color: "#22c55e" },
            ],
            artifacts: [
              { name: "Reading List", type: "note" },
              { name: "Paper Summaries", type: "note" },
              { name: "Related Work Outline", type: "note" },
            ],
          },
          {
            name: "Experiments",
            columns: [
              { name: "Proposed", color: "#94a3b8" },
              { name: "Setup", color: "#f59e0b" },
              { name: "Running", color: "#3b82f6" },
              { name: "Analyzing", color: "#8b5cf6" },
              { name: "Complete", color: "#22c55e" },
            ],
            artifacts: [
              { name: "Experiment Design", type: "note" },
              { name: "Data Collection Plan", type: "note" },
              { name: "Results", type: "note" },
            ],
          },
          {
            name: "Publication",
            columns: [
              { name: "Outline", color: "#94a3b8" },
              { name: "Drafting", color: "#f59e0b" },
              { name: "Review", color: "#8b5cf6" },
              { name: "Submitted", color: "#3b82f6" },
              { name: "Published", color: "#22c55e" },
            ],
            artifacts: [
              { name: "Paper Draft", type: "note" },
              { name: "Conference Submission", type: "note" },
              { name: "Presentation Slides", type: "note" },
            ],
          },
        ],
      },
    },
  ];

  for (const tpl of noteTemplates) {
    if (!existingNames.has(tpl.name)) {
      repo.create({ type: "note", name: tpl.name, description: tpl.description, content: JSON.stringify(tpl.content) });
    }
  }

  for (const tpl of projectTemplates) {
    if (!existingNames.has(tpl.name)) {
      repo.create({ type: "project", name: tpl.name, description: tpl.description, content: JSON.stringify(tpl.content) });
    }
  }
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
  } else {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
