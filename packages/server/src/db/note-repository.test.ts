import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { NoteRepository } from "./note-repository.js";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '/', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE VIRTUAL TABLE notes_fts USING fts5(note_id UNINDEXED, title, content);
  `);
  return db;
}

describe("NoteRepository", () => {
  let db: Database.Database;
  let repo: NoteRepository;

  beforeEach(() => {
    db = createDb();
    repo = new NoteRepository(db);
  });

  it("creates a note", () => {
    const note = repo.create({ title: "Test", content: "Hello" });
    expect(note.title).toBe("Test");
    expect(note.content).toBe("Hello");
    expect(note.id).toBeTruthy();
    expect(note.path).toBe("/Unsorted");
  });

  it("retrieves a note by id", () => {
    const created = repo.create({ title: "Test" });
    const found = repo.getById(created.id);
    expect(found).not.toBeNull();
    expect(found!.title).toBe("Test");
  });

  it("returns null for missing note", () => {
    expect(repo.getById("nonexistent")).toBeNull();
  });

  it("lists all notes", () => {
    repo.create({ title: "A" });
    repo.create({ title: "B" });
    const all = repo.list({ limit: 100, offset: 0 });
    expect(all.items).toHaveLength(2);
    expect(all.total).toBe(2);
    expect(all.hasMore).toBe(false);
  });

  it("updates a note", () => {
    const note = repo.create({ title: "Old", content: "Old content" });
    const updated = repo.update(note.id, { title: "New", content: "New content" });
    expect(updated!.title).toBe("New");
    expect(updated!.content).toBe("New content");
  });

  it("deletes a note", () => {
    const note = repo.create({ title: "Delete me" });
    repo.delete(note.id);
    expect(repo.getById(note.id)).toBeNull();
  });

  it("finds note by title", () => {
    repo.create({ title: "Unique Title" });
    const found = repo.getByTitle("Unique Title");
    expect(found).not.toBeNull();
    expect(found!.title).toBe("Unique Title");
  });

  it("finds content containing substring", () => {
    repo.create({ title: "T", content: "find this text" });
    const results = repo.findByContentContaining("find this");
    expect(results).toHaveLength(1);
  });
});
