import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import Database from "better-sqlite3";
import request from "supertest";
import { NoteRepository } from "../db/note-repository.js";
import { TagRepository } from "../db/tag-repository.js";
import { LinkRepository } from "../db/link-repository.js";
import { createNotesRouter } from "./notes.js";
import { AppError } from "../lib/errors.js";

function createApp() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '/', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
    CREATE TABLE note_tags (note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (note_id, tag_id));
    CREATE TABLE links (source_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, target_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, PRIMARY KEY (source_id, target_id));
    CREATE VIRTUAL TABLE notes_fts USING fts5(note_id UNINDEXED, title, content);
  `);

  const noteRepo = new NoteRepository(db);
  const tagRepo = new TagRepository(db);
  const linkRepo = new LinkRepository(db);

  const app = express();
  app.use(express.json());
  app.use("/api/notes", createNotesRouter(noteRepo, tagRepo, linkRepo));
  app.use((err: Error, _req: any, res: any, _next: any) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return { app, noteRepo };
}

describe("GET /api/notes", () => {
  it("returns empty list initially", async () => {
    const { app } = createApp();
    const res = await request(app).get("/api/notes");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns created notes", async () => {
    const { app, noteRepo } = createApp();
    noteRepo.create({ title: "Test" });
    const res = await request(app).get("/api/notes");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Test");
  });
});

describe("POST /api/notes", () => {
  it("creates a note", async () => {
    const { app } = createApp();
    const res = await request(app)
      .post("/api/notes")
      .send({ title: "New Note", content: "Hello" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("New Note");
    expect(res.body.id).toBeTruthy();
  });

  it("returns 400 without title or content", async () => {
    const { app } = createApp();
    const res = await request(app)
      .post("/api/notes")
      .send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/notes/:id", () => {
  it("returns a note by id", async () => {
    const { app, noteRepo } = createApp();
    const note = noteRepo.create({ title: "My Note" });
    const res = await request(app).get(`/api/notes/${note.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("My Note");
  });

  it("returns 404 for missing note", async () => {
    const { app } = createApp();
    const res = await request(app).get("/api/notes/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/notes/:id", () => {
  it("updates a note", async () => {
    const { app, noteRepo } = createApp();
    const note = noteRepo.create({ title: "Old" });
    const res = await request(app)
      .put(`/api/notes/${note.id}`)
      .send({ title: "Updated" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated");
  });
});

describe("DELETE /api/notes/:id", () => {
  it("deletes a note", async () => {
    const { app, noteRepo } = createApp();
    const note = noteRepo.create({ title: "Delete me" });
    const res = await request(app).delete(`/api/notes/${note.id}`);
    expect(res.status).toBe(204);
    expect(noteRepo.getById(note.id)).toBeNull();
  });
});

describe("GET /api/notes/by-title/:title", () => {
  it("finds a note by title", async () => {
    const { app, noteRepo } = createApp();
    noteRepo.create({ title: "Exact Title" });
    const res = await request(app).get("/api/notes/by-title/Exact%20Title");
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Exact Title");
  });

  it("returns 404 for missing title", async () => {
    const { app } = createApp();
    const res = await request(app).get("/api/notes/by-title/NotFound");
    expect(res.status).toBe(404);
  });
});
