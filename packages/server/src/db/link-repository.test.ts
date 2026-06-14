import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { LinkRepository } from "./link-repository.js";
import { NoteRepository } from "./note-repository.js";

function createDb() {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE notes (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '/', created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE links (source_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, target_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, PRIMARY KEY (source_id, target_id));
    CREATE VIRTUAL TABLE notes_fts USING fts5(note_id UNINDEXED, title, content);
  `);
  return db;
}

describe("LinkRepository", () => {
  let db: Database.Database;
  let noteRepo: NoteRepository;
  let linkRepo: LinkRepository;

  beforeEach(() => {
    db = createDb();
    noteRepo = new NoteRepository(db);
    linkRepo = new LinkRepository(db);
  });

  it("sets and retrieves links", () => {
    const a = noteRepo.create({ title: "A" });
    const b = noteRepo.create({ title: "B" });
    linkRepo.setLinks(a.id, [b.id]);

    const all = linkRepo.getAllLinks();
    expect(all).toHaveLength(1);
    expect(all[0].sourceId).toBe(a.id);
    expect(all[0].targetId).toBe(b.id);
  });

  it("replaces existing links", () => {
    const a = noteRepo.create({ title: "A" });
    const b = noteRepo.create({ title: "B" });
    const c = noteRepo.create({ title: "C" });

    linkRepo.setLinks(a.id, [b.id]);
    linkRepo.setLinks(a.id, [c.id]);

    const all = linkRepo.getAllLinks();
    expect(all).toHaveLength(1);
    expect(all[0].targetId).toBe(c.id);
  });

  it("finds backlinks", () => {
    const a = noteRepo.create({ title: "A" });
    const b = noteRepo.create({ title: "B" });
    linkRepo.setLinks(a.id, [b.id]);

    const backlinks = linkRepo.getBacklinks(b.id);
    expect(backlinks).toEqual([a.id]);
  });

  it("returns empty backlinks for unlinked notes", () => {
    const a = noteRepo.create({ title: "A" });
    expect(linkRepo.getBacklinks(a.id)).toEqual([]);
  });

  it("returns backlink counts", () => {
    const a = noteRepo.create({ title: "A" });
    const b = noteRepo.create({ title: "B" });
    const c = noteRepo.create({ title: "C" });
    linkRepo.setLinks(a.id, [c.id]);
    linkRepo.setLinks(b.id, [c.id]);

    const counts = linkRepo.getBacklinkCounts();
    expect(counts[c.id]).toBe(2);
  });
});
