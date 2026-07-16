import { Router } from "express";
import { v4 as uuid } from "uuid";
import { getDb } from "../db/index.js";
import type { TemplateRepository } from "../db/template-repository.js";
import type { NoteRepository } from "../db/note-repository.js";
import type { TagRepository } from "../db/tag-repository.js";
import type { ProjectRepository } from "../db/project-repository.js";
import type { PeopleRepository } from "../db/people-repository.js";
import { asyncHandler } from "../lib/async-handler.js";

interface SeedConfig {
  notes?: number;
  projects?: number;
  people?: number;
  canvases?: number;
  uploads?: number;
  linkDensity?: number;
  versionCount?: number;
  tagPoolSize?: number;
}

const DELETE_ORDER = [
  "note_people",
  "project_milestone_cards",
  "project_card_labels",
  "project_card_comments",
  "project_card_checklists",
  "note_tags",
  "links",
  "note_versions",
  "canvas_edges",
  "canvas_versions",
  "canvas_groups",
  "canvas_items",
  "project_cards",
  "project_columns",
  "project_groups",
  "project_milestones",
  "project_labels",
  "project_card_templates",
  "project_artifacts",
  "uploads",
  "canvases",
  "projects",
  "notes_fts",
  "notes",
  "tags",
  "people",
  "templates",
];

const SAMPLE_TITLES = [
  "Getting Started with Jotted",
  "Meeting Notes: Sprint Review",
  "Architecture Decision: Database Layer",
  "Weekly Planning Session",
  "Ideas for New Features",
  "Project Roadmap Q3",
  "Onboarding Guide",
  "API Documentation",
  "Bug Report: Search Not Working",
  "Release Notes v2.0",
  "Design System Guidelines",
  "Performance Optimization Tips",
  "Customer Feedback Summary",
  "Book Notes: Clean Architecture",
  "Deployment Checklist",
  "Brain Dump: Random Thoughts",
  "Research: Graph Databases",
  "Code Review Guidelines",
  "Workshop: TypeScript Best Practices",
  "Interview Questions Bank",
  "Personal Goals for This Month",
  "Travel Itinerary",
  "Recipe: Pasta Carbonara",
  "Fitness Routine",
  "Reading List 2024",
  "Project Proposal: Mobile App",
  "Retrospective: Q2",
  "Vendor Evaluation Notes",
  "Training Materials",
  "System Architecture Diagram Notes",
];

const SAMPLE_CONTENT_BLOCKS = [
  "# Overview\n\nThis is a high-level overview of the topic at hand. We need to consider several factors before proceeding.\n\n## Background\n\nSome context and background information that helps frame the discussion.\n\n## Next Steps\n\n- [ ] Research competitive solutions\n- [ ] Draft proposal document\n- [ ] Review with team",
  "## Agenda\n\n1. Review action items from last meeting\n2. Status updates from each team\n3. Discussion on new priorities\n4. Next steps and assignments\n\n### Notes\n\n- The team agreed to push the deadline by one week\n- Need to schedule follow-up for next Thursday\n- Budget approval is still pending",
  "# Summary\n\nThe key findings of this investigation suggest that we should adopt a microservices architecture for the new platform.\n\n## Pros\n- Independent scaling\n- Team autonomy\n- Technology flexibility\n\n## Cons\n- Increased operational complexity\n- Network latency\n- Data consistency challenges\n\n## Recommendation\n\nStart with a modular monolith and extract services as needed.",
  "# Getting Started\n\nWelcome to the project. Here is everything you need to know to get up and running quickly.\n\n## Prerequisites\n\n- Node.js 18+\n- npm 9+\n- Git\n\n## Installation\n\n```bash\ngit clone https://example.com/repo.git\ncd repo\nnpm install\nnpm run dev\n```\n\n## Configuration\n\nCopy `.env.example` to `.env` and adjust the values.",
  "## Today's Tasks\n\n- [x] Respond to emails\n- [x] Review PR #42\n- [ ] Update documentation\n- [ ] Plan sprint backlog\n- [ ] Research performance caching\n\n## Notes\n\nFound an interesting approach for caching. Need to discuss with the team during the next standup.\n\n> The best way to predict the future is to invent it.",
  "## Error Log\n\n```\nError: Connection refused at port 5432\n    at TCPConnectWrap.afterConnect\n    at Socket.connect\n```\n\nRoot cause analysis: The database server was down due to a scheduled maintenance window that was not communicated to the team.\n\n### Prevention\n\n- Add health check monitoring\n- Set up alerting for connection failures\n- Document maintenance windows in shared calendar",
  "# Meeting: Q3 Planning\n\n**Date:** 2025-07-15\n**Location:** Conference Room B\n\n## Discussion Points\n\n1. Review Q2 achievements\n2. Set Q3 objectives\n3. Resource allocation\n4. Risk assessment\n\n## Action Items\n\n- [ ] Alice: Draft Q3 roadmap document\n- [ ] Bob: Prepare budget estimates\n- [ ] Carol: Schedule follow-up sessions",
];

const TAG_POOL = [
  "important",
  "todo",
  "meeting",
  "reference",
  "technical",
  "personal",
  "archived",
  "project-x",
  "design",
  "research",
  "draft",
  "published",
  "bug",
  "feature",
  "documentation",
  "planning",
  "daily",
  "review",
  "priority",
  "low-priority",
];

const PEOPLE_POOL = [
  { name: "Alice Chen", email: "alice@example.com" },
  { name: "Bob Martinez", email: "bob@example.com" },
  { name: "Carol Singh", email: "carol@example.com" },
  { name: "Dave Kim", email: "dave@example.com" },
  { name: "Eve Johnson", email: "eve@example.com" },
  { name: "Frank Williams", email: "frank@example.com" },
  { name: "Grace Patel", email: "grace@example.com" },
  { name: "Henry Tanaka", email: "henry@example.com" },
  { name: "Iris Mueller", email: "iris@example.com" },
  { name: "Jack O'Brien", email: "jack@example.com" },
  { name: "Karen Davis", email: "karen@example.com" },
  { name: "Leo Garcia", email: "leo@example.com" },
  { name: "Maria Rossi", email: "maria@example.com" },
  { name: "Noah Andersson", email: "noah@example.com" },
  { name: "Olivia Brown", email: "olivia@example.com" },
];

const FOLDER_PATHS = [
  "/Unsorted",
  "/Journal",
  "/Projects",
  "/Reference",
  "/Archive",
  "/Meetings",
  "/Personal",
  "/Work",
  "/Ideas",
  "/Learning",
];

const COLUMN_PRESETS = [
  [
    { name: "Backlog", color: "#94a3b8" },
    { name: "In Progress", color: "#f59e0b" },
    { name: "Done", color: "#22c55e" },
  ],
  [
    { name: "To Do", color: "#94a3b8" },
    { name: "Doing", color: "#3b82f6" },
    { name: "Review", color: "#8b5cf6" },
    { name: "Complete", color: "#22c55e" },
  ],
  [
    { name: "Ideas", color: "#94a3b8" },
    { name: "Planned", color: "#f59e0b" },
    { name: "Building", color: "#3b82f6" },
    { name: "Shipped", color: "#22c55e" },
  ],
];

const LABEL_PRESETS = [
  { name: "Bug", color: "#ef4444" },
  { name: "Feature", color: "#3b82f6" },
  { name: "Enhancement", color: "#22c55e" },
  { name: "Documentation", color: "#8b5cf6" },
  { name: "Priority", color: "#f59e0b" },
  { name: "Technical Debt", color: "#94a3b8" },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  return d.toISOString();
}

function generateNoteContent(linkTitles: string[], tagsForNote: string[]): string {
  let body = pick(SAMPLE_CONTENT_BLOCKS);
  if (linkTitles.length > 0) {
    const linkText = linkTitles.map((t) => `[[${t}]]`).join(" ");
    body += `\n\n## See Also\n\n${linkText}`;
  }
  if (tagsForNote.length > 0) {
    const tagText = tagsForNote.map((t) => `#${t}`).join(" ");
    body += `\n\n${tagText}`;
  }
  return body;
}

export function createDevRouter(
  templateRepo: TemplateRepository,
  noteRepo: NoteRepository,
  tagRepo: TagRepository,
  projectRepo: ProjectRepository,
  peopleRepo: PeopleRepository,
): Router {
  const router = Router();

  router.get(
    "/stats",
    asyncHandler(async (_req, res) => {
      const db = getDb();
      const stats: Record<string, number> = {};
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all() as { name: string }[];
      for (const { name } of tables) {
        if (name.endsWith("_fts") || name.endsWith("_fts_content") ||
            name.endsWith("_fts_idx") || name.endsWith("_fts_data") ||
            name.endsWith("_fts_docsize") || name.endsWith("_fts_config")) continue;
        const row = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get() as { count: number };
        stats[name] = row.count;
      }
      res.json(stats);
    }),
  );

  router.post(
    "/reset",
    asyncHandler(async (req, res) => {
      const db = getDb();
      const keepTemplates = req.query.keepTemplates !== "false";

      const transaction = db.transaction(() => {
        db.pragma("foreign_keys = OFF");
        for (const table of DELETE_ORDER) {
          try {
            db.exec(`DELETE FROM "${table}"`);
          } catch {
            // Table may not exist yet (e.g., migration not applied)
          }
        }
        db.pragma("foreign_keys = ON");
      });
      transaction();

      if (keepTemplates) {
        const existing = templateRepo.list();
        const existingNames = new Set(existing.map((t) => t.name));
        for (const tpl of getBuiltInTemplates().noteTemplates) {
          if (!existingNames.has(tpl.name)) {
            templateRepo.create({ type: "note", name: tpl.name, description: tpl.description, content: JSON.stringify(tpl.content) });
          }
        }
        for (const tpl of getBuiltInTemplates().projectTemplates) {
          if (!existingNames.has(tpl.name)) {
            templateRepo.create({ type: "project", name: tpl.name, description: tpl.description, content: JSON.stringify(tpl.content) });
          }
        }
      }

      const stats: Record<string, number> = {};
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        .all() as { name: string }[];
      for (const { name } of tables) {
        if (name.endsWith("_fts") || name.endsWith("_fts_content") ||
            name.endsWith("_fts_idx") || name.endsWith("_fts_data") ||
            name.endsWith("_fts_docsize") || name.endsWith("_fts_config")) continue;
        const row = db.prepare(`SELECT COUNT(*) as count FROM "${name}"`).get() as { count: number };
        stats[name] = row.count;
      }

      res.json({ success: true, stats });
    }),
  );

  router.post(
    "/seed",
    asyncHandler(async (req, res) => {
      const db = getDb();
      const config: SeedConfig = {
        notes: req.body.notes ?? 10,
        projects: req.body.projects ?? 2,
        people: req.body.people ?? 5,
        canvases: req.body.canvases ?? 1,
        uploads: req.body.uploads ?? 3,
        linkDensity: req.body.linkDensity ?? 0.3,
        versionCount: req.body.versionCount ?? 2,
        tagPoolSize: req.body.tagPoolSize ?? 8,
      };

      const created: Record<string, number> = {};

      const transaction = db.transaction(() => {
        const tagIds: string[] = [];
        const tagNames = pickN(TAG_POOL, config.tagPoolSize!);
        for (const tagName of tagNames) {
          const id = uuid();
          db.prepare("INSERT INTO tags (id, name) VALUES (?, ?)").run(id, tagName);
          tagIds.push(id);
        }
        created.tags = tagIds.length;

        const personIds: string[] = [];
        for (const p of pickN(PEOPLE_POOL, config.people!)) {
          const id = uuid();
          db.prepare("INSERT INTO people (id, name, email) VALUES (?, ?, ?)").run(id, p.name, p.email);
          personIds.push(id);
        }
        created.people = personIds.length;

        const noteIds: string[] = [];
        const noteTitles: string[] = [];
        for (let i = 0; i < config.notes!; i++) {
          const id = uuid();
          const title = i < SAMPLE_TITLES.length
            ? SAMPLE_TITLES[i]
            : `${pick(["Notes", "Thoughts", "Ideas", "Research", "Plan"])} ${i + 1}`;
          noteTitles.push(title);
          const path = pick(FOLDER_PATHS);
          const noteType = i % 10 === 0 ? "meeting" : "note";
          const meetingStart = noteType === "meeting" ? randomDate(30) : null;
          const meetingEnd = noteType === "meeting" && meetingStart
            ? new Date(new Date(meetingStart).getTime() + 3600000).toISOString()
            : null;
          const createdAt = randomDate(90);
          const updatedAt = randomDate(7);

          db.prepare(
            `INSERT INTO notes (id, title, content, path, note_type, meeting_location, meeting_start, meeting_end, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(id, title, "", path, noteType,
            noteType === "meeting" ? pick(["Room A", "Room B", "Virtual", "Cafeteria"]) : null,
            meetingStart, meetingEnd, createdAt, updatedAt);
          noteIds.push(id);
        }
        created.notes = noteIds.length;

        for (let i = 0; i < noteIds.length; i++) {
          const id = noteIds[i];
          const title = noteTitles[i];

          const linkCount = Math.floor(config.linkDensity! * noteIds.length);
          const possibleLinks = noteIds.filter((nid) => nid !== id);
          const selectedLinks = pickN(possibleLinks, Math.min(linkCount, possibleLinks.length));
          const linkTitles: string[] = [];
          for (const targetId of selectedLinks) {
            const targetIdx = noteIds.indexOf(targetId);
            if (targetIdx >= 0 && !linkTitles.includes(noteTitles[targetIdx])) {
              linkTitles.push(noteTitles[targetIdx]);
            }
          }

          const assignedTagIds = pickN(tagIds, randInt(1, Math.min(4, tagIds.length)));
          const assignedTagNames = assignedTagIds.map((tid) => tagNames[tagIds.indexOf(tid)]);
          const content = generateNoteContent(linkTitles, assignedTagNames);

          db.prepare("UPDATE notes SET content = ? WHERE id = ?").run(content, id);
          db.prepare("INSERT INTO notes_fts (note_id, title, content) VALUES (?, ?, ?)").run(id, title, content);

          for (const targetId of selectedLinks) {
            try {
              db.prepare("INSERT OR IGNORE INTO links (source_id, target_id) VALUES (?, ?)").run(id, targetId);
            } catch { /* ignore duplicate */ }
          }

          for (const tagId of assignedTagIds) {
            db.prepare("INSERT OR IGNORE INTO note_tags (note_id, tag_id, source) VALUES (?, ?, ?)").run(id, tagId, "content");
          }

          for (let v = 0; v < randInt(0, config.versionCount!); v++) {
            db.prepare(
              `INSERT INTO note_versions (id, note_id, title, content, created_at)
               VALUES (?, ?, ?, ?, ?)`,
            ).run(
              uuid(),
              id,
              title + (v > 0 ? ` (v${v})` : ""),
              content.slice(0, Math.floor(content.length * (0.3 + v * 0.3))),
              randomDate(60),
            );
          }

          const noteType = db.prepare("SELECT note_type FROM notes WHERE id = ?").get(id) as { note_type: string } | undefined;
          if (noteType?.note_type === "meeting" && personIds.length > 0) {
            const organizerId = pick(personIds);
            db.prepare("INSERT OR IGNORE INTO note_people (note_id, person_id, role) VALUES (?, ?, ?)").run(id, organizerId, "organizer");
            const attendeeIds = pickN(personIds.filter((p) => p !== organizerId), randInt(0, 3));
            for (const pid of attendeeIds) {
              const status = pick(["accepted", "tentative", "declined", "needs-action"]);
              db.prepare("INSERT OR IGNORE INTO note_people (note_id, person_id, role, status) VALUES (?, ?, ?, ?)").run(id, pid, "attendee", status);
            }
          }
        }

        created.projects = 0;
        for (let p = 0; p < config.projects!; p++) {
          const projectId = uuid();
          const projectTitle = `${pick(["Project", "Initiative", "Program", "Effort"])} ${pick(["Alpha", "Beta", "Gamma", "Delta", "Phoenix", "Titan", "Nova", "Spectrum"])}`;
          db.prepare(
            `INSERT INTO projects (id, title, description, status, start_date, end_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(
            projectId,
            projectTitle,
            `Description for ${projectTitle}`,
            pick(["planning", "active", "completed", "on_hold"]),
            randomDate(60),
            randomDate(30),
          );
          created.projects++;

          for (let l = 0; l < randInt(1, 2); l++) {
            const labelId = uuid();
            const lbl = pick(LABEL_PRESETS);
            db.prepare(
              "INSERT INTO project_labels (id, project_id, name, color, position) VALUES (?, ?, ?, ?, ?)",
            ).run(labelId, projectId, lbl.name, lbl.color, l);
          }

          for (let m = 0; m < randInt(1, 3); m++) {
            const mId = uuid();
            db.prepare(
              `INSERT INTO project_milestones (id, project_id, title, description, due_date, completed, position)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ).run(mId, projectId, `Milestone ${m + 1}`, `Description for milestone ${m + 1}`,
              randomDate(45), Math.random() > 0.6 ? 1 : 0, m);
          }

          const groupCount = randInt(1, 3);
          const allLabelIds = (db.prepare("SELECT id FROM project_labels WHERE project_id = ?").all(projectId) as { id: string }[]);
          for (let g = 0; g < groupCount; g++) {
            const groupId = uuid();
            db.prepare(
              `INSERT INTO project_groups (id, project_id, title, description, position)
               VALUES (?, ?, ?, ?, ?)`,
            ).run(groupId, projectId, `${pick(["Development", "Design", "QA", "Research", "Planning", "Operations", "Content", "Marketing"])} ${g + 1}`, "", g);

            const colPreset = pick(COLUMN_PRESETS);
            for (let c = 0; c < colPreset.length; c++) {
              const colId = uuid();
              db.prepare(
                `INSERT INTO project_columns (id, group_id, title, color, position)
                 VALUES (?, ?, ?, ?, ?)`,
              ).run(colId, groupId, colPreset[c].name, colPreset[c].color, c);

              const cardCount = randInt(1, 5);
              for (let k = 0; k < cardCount; k++) {
                const cardId = uuid();
                const cardTitle = `${pick(["Add", "Fix", "Update", "Implement", "Refactor", "Design", "Review", "Test", "Document"])} ${pick(["login flow", "dashboard", "API endpoint", "database schema", "user settings", "search feature", "notification system", "export tool", "dark mode", "error handling"])}`;
                db.prepare(
                  `INSERT INTO project_cards (id, column_id, title, description, due_date, position)
                   VALUES (?, ?, ?, ?, ?, ?)`,
                ).run(cardId, colId, cardTitle, `Description: ${cardTitle}`, Math.random() > 0.5 ? randomDate(21) : null, k);

                if (Math.random() > 0.5) {
                  for (let ch = 0; ch < randInt(0, 3); ch++) {
                    db.prepare(
                      "INSERT INTO project_card_checklists (id, card_id, text, position, done) VALUES (?, ?, ?, ?, ?)",
                    ).run(uuid(), cardId, `${pick(["Review", "Verify", "Test", "Document", "Deploy"])} step ${ch + 1}`, ch, Math.random() > 0.6 ? 1 : 0);
                  }
                }

                if (Math.random() > 0.7) {
                  db.prepare(
                    "INSERT INTO project_card_comments (id, card_id, body) VALUES (?, ?, ?)",
                  ).run(uuid(), cardId, pick([
                    "Looks good, approved.",
                    "Need clarification on this.",
                    "Moving this to next sprint.",
                    "Blocked by dependency.",
                    "Great progress!",
                  ]));
                }

                if (allLabelIds.length > 0 && Math.random() > 0.5) {
                  const lbl = pick(allLabelIds);
                  try {
                    db.prepare("INSERT OR IGNORE INTO project_card_labels (card_id, label_id) VALUES (?, ?)").run(cardId, lbl.id);
                  } catch { /* ignore */ }
                }
              }
            }

            if (Math.random() > 0.5 && noteIds.length > 0) {
              const artId = uuid();
              db.prepare(
                `INSERT INTO project_artifacts (id, project_id, group_id, title, artifact_type, reference_id, position)
                 VALUES (?, ?, ?, ?, 'note', ?, ?)`,
              ).run(artId, projectId, groupId, pick(SAMPLE_TITLES), pick(noteIds), 0);
            }
          }
        }

        created.canvases = 0;
        for (let c = 0; c < config.canvases!; c++) {
          const canvasId = uuid();
          db.prepare(
            "INSERT INTO canvases (id, title) VALUES (?, ?)",
          ).run(canvasId, `${pick(["Whiteboard", "Ideas Board", "Brainstorm", "Diagram", "Sketch"])} ${c + 1}`);

          const itemIds: string[] = [];
          for (let i = 0; i < randInt(3, 8); i++) {
            const itemId = uuid();
            const itemType = i % 3 === 0 && noteIds.length > 0 ? "note_pin" : "text_box";
            db.prepare(
              `INSERT INTO canvas_items (id, canvas_id, note_id, type, text, color, x, y, width, height, z_index)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ).run(
              itemId, canvasId,
              itemType === "note_pin" ? pick(noteIds) : null,
              itemType,
              pick(["Feature idea", "Next steps", "Questions", "Important", "TODO", "Draft"]),
              pick(["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]),
              randInt(50, 800),
              randInt(50, 500),
              randInt(150, 350),
              randInt(80, 200),
              i,
            );
            itemIds.push(itemId);
          }

          for (let e = 0; e < randInt(1, Math.min(5, itemIds.length * 2)); e++) {
            const sourceId = pick(itemIds);
            let targetId = pick(itemIds);
            while (targetId === sourceId && itemIds.length > 1) {
              targetId = pick(itemIds);
            }
            if (targetId !== sourceId) {
              db.prepare(
                `INSERT INTO canvas_edges (id, canvas_id, source_item_id, target_item_id, type)
                 VALUES (?, ?, ?, ?, ?)`,
              ).run(uuid(), canvasId, sourceId, targetId, pick(["straight", "curved"]));
            }
          }
          created.canvases++;
        }

        created.uploads = 0;
        for (let u = 0; u < config.uploads!; u++) {
          const uploadId = uuid();
          const targetNote = noteIds.length > 0 ? pick(noteIds) : null;
          db.prepare(
            `INSERT INTO uploads (id, note_id, filename, original_name, mime_type, size)
             VALUES (?, ?, ?, ?, ?, ?)`,
          ).run(
            uploadId,
            targetNote,
            `upload_${u}.${pick(["png", "jpg", "gif"])}`,
            `${pick(["screenshot", "photo", "diagram", "logo", "attachment"])}.${pick(["png", "jpg", "gif"])}`,
            pick(["image/png", "image/jpeg", "image/gif"]),
            randInt(1024, 5242880),
          );
          created.uploads++;
        }
      });
      transaction();

      res.json({ success: true, created });
    }),
  );

  return router;
}

function getBuiltInTemplates() {
  return {
    noteTemplates: [
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
        name: "To-Do",
        description: "Simple to-do list with progress tracking",
        content: {
          title: "To-Do: {{title}}",
          body: "# To-Do: {{title}}\n\n## To-Do\n\n- [ ] \n\n## In Progress\n\n- [ ] \n\n## Done\n\n- [ ] \n\n",
          tags: ["todo"],
          folder: "/Tasks",
        },
      },
    ],
    projectTemplates: [
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
    ],
  };
}
