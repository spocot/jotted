import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import type { PageResponse } from "../lib/pagination.js";
import { buildPageResponse } from "../lib/pagination.js";
import type { Note } from "./note-repository.js";

export interface Tag {
  id: string;
  name: string;
  noteCount: number;
  source?: "content" | "manual";
}

export class TagRepository {
  private getAllStmt: Database.Statement;
  private getByNameStmt: Database.Statement;
  private insertTagStmt: Database.Statement;
  private addToNoteStmt: Database.Statement;
  private removeFromNoteStmt: Database.Statement;
  private getNoteIdsStmt: Database.Statement;
  private getByIdStmt: Database.Statement;
  private deleteUnusedStmt: Database.Statement;
  private renameStmt: Database.Statement;
  private deleteTagStmt: Database.Statement;
  private getTagsForNoteStmt: Database.Statement;
  private getTagsForNoteBySourceStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.getAllStmt = db.prepare(`
      SELECT t.id, t.name, COUNT(nt.note_id) AS noteCount
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      GROUP BY t.id
      ORDER BY t.name
    `);
    this.getByIdStmt = db.prepare(`
      SELECT t.id, t.name, COUNT(nt.note_id) AS noteCount
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      WHERE t.id = ?
      GROUP BY t.id
    `);
    this.getByNameStmt = db.prepare(`
      SELECT t.id, t.name, COUNT(nt.note_id) AS noteCount
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      WHERE t.name = ?
      GROUP BY t.id
    `);
    this.insertTagStmt = db.prepare("INSERT INTO tags (id, name) VALUES (?, ?)");
    this.addToNoteStmt = db.prepare(
      "INSERT OR IGNORE INTO note_tags (note_id, tag_id, source) VALUES (?, ?, ?)",
    );
    this.removeFromNoteStmt = db.prepare(
      "DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?",
    );
    this.getNoteIdsStmt = db.prepare(
      "SELECT note_id FROM note_tags WHERE tag_id = ?",
    );
    this.getTagsForNoteStmt = db.prepare(`
      SELECT t.id, t.name, COUNT(nt2.note_id) AS noteCount, nt.source
      FROM tags t
      JOIN note_tags nt ON t.id = nt.tag_id
      LEFT JOIN note_tags nt2 ON t.id = nt2.tag_id
      WHERE nt.note_id = ?
      GROUP BY t.id
    `);
    this.getTagsForNoteBySourceStmt = db.prepare(`
      SELECT t.id, t.name, nt.source
      FROM tags t
      JOIN note_tags nt ON t.id = nt.tag_id
      WHERE nt.note_id = ? AND nt.source = ?
    `);
    this.renameStmt = db.prepare("UPDATE tags SET name = ? WHERE id = ?");
    this.deleteTagStmt = db.prepare("DELETE FROM tags WHERE id = ?");
    this.deleteUnusedStmt = db.prepare(
      "DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)",
    );
  }

  getAll(): Tag[] {
    return this.getAllStmt.all() as Tag[];
  }

  getById(id: string): Tag | null {
    return (this.getByIdStmt.get(id) as Tag | null) ?? null;
  }

  getByName(name: string): Tag | null {
    return (this.getByNameStmt.get(name) as Tag | null) ?? null;
  }

  rename(id: string, newName: string): void {
    this.renameStmt.run(newName, id);
  }

  deleteTag(id: string): void {
    this.deleteTagStmt.run(id);
  }

  upsert(name: string): Tag {
    const existing = this.getByName(name);
    if (existing) return existing;

    const id = uuid();
    this.insertTagStmt.run(id, name);
    return { id, name, noteCount: 0 };
  }

  addToNote(noteId: string, tagId: string, source: "content" | "manual" = "content"): void {
    this.addToNoteStmt.run(noteId, tagId, source);
  }

  removeFromNote(noteId: string, tagId: string): void {
    this.removeFromNoteStmt.run(noteId, tagId);
  }

  getNoteIdsForTag(tagId: string): string[] {
    const rows = this.getNoteIdsStmt.all(tagId) as { note_id: string }[];
    return rows.map((r) => r.note_id);
  }

  getNotesForTag(
    tagId: string,
    limit: number,
    offset: number,
  ): PageResponse<Note> {
    const countRow = this.db
      .prepare(
        "SELECT COUNT(*) AS count FROM note_tags WHERE tag_id = ?",
      )
      .get(tagId) as { count: number };
    const total = countRow.count;

    const items = this.db
      .prepare(
        `SELECT n.id, n.title, n.content, n.path, n.created_at AS createdAt, n.updated_at AS updatedAt
         FROM notes n
         JOIN note_tags nt ON n.id = nt.note_id
         WHERE nt.tag_id = ?
         ORDER BY n.updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(tagId, limit, offset) as Note[];

    return buildPageResponse(items, total, limit, offset);
  }

  getTagsForNotes(noteIds: string[]): Record<string, string[]> {
    if (noteIds.length === 0) return {};
    const placeholders = noteIds.map(() => "?").join(",");
    const rows = this.db
      .prepare(
        `SELECT nt.note_id, t.name FROM note_tags nt JOIN tags t ON t.id = nt.tag_id WHERE nt.note_id IN (${placeholders})`,
      )
      .all(...noteIds) as { note_id: string; name: string }[];
    const result: Record<string, string[]> = {};
    for (const row of rows) {
      if (!result[row.note_id]) result[row.note_id] = [];
      result[row.note_id].push(row.name);
    }
    return result;
  }

  getTagsForNote(noteId: string): Tag[] {
    return this.getTagsForNoteStmt.all(noteId) as Tag[];
  }

  getTagsForNoteBySource(noteId: string, source: "content" | "manual"): Tag[] {
    return this.getTagsForNoteBySourceStmt.all(noteId, source) as Tag[];
  }

  deleteUnused(): void {
    this.deleteUnusedStmt.run();
  }
}
