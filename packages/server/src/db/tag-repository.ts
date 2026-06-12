import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface Tag {
  id: string;
  name: string;
  noteCount: number;
}

export class TagRepository {
  private getAllStmt: Database.Statement;
  private getByNameStmt: Database.Statement;
  private insertTagStmt: Database.Statement;
  private addToNoteStmt: Database.Statement;
  private removeFromNoteStmt: Database.Statement;
  private getNoteIdsStmt: Database.Statement;
  private deleteUnusedStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.getAllStmt = db.prepare(`
      SELECT t.id, t.name, COUNT(nt.note_id) AS noteCount
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      GROUP BY t.id
      ORDER BY t.name
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
      "INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)",
    );
    this.removeFromNoteStmt = db.prepare(
      "DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?",
    );
    this.getNoteIdsStmt = db.prepare(
      "SELECT note_id FROM note_tags WHERE tag_id = ?",
    );
    this.deleteUnusedStmt = db.prepare(
      "DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)",
    );
  }

  getAll(): Tag[] {
    return this.getAllStmt.all() as Tag[];
  }

  getByName(name: string): Tag | null {
    return (this.getByNameStmt.get(name) as Tag | null) ?? null;
  }

  upsert(name: string): Tag {
    const existing = this.getByName(name);
    if (existing) return existing;

    const id = uuid();
    this.insertTagStmt.run(id, name);
    return { id, name, noteCount: 0 };
  }

  addToNote(noteId: string, tagId: string): void {
    this.addToNoteStmt.run(noteId, tagId);
  }

  removeFromNote(noteId: string, tagId: string): void {
    this.removeFromNoteStmt.run(noteId, tagId);
  }

  getNoteIdsForTag(tagId: string): string[] {
    const rows = this.getNoteIdsStmt.all(tagId) as { note_id: string }[];
    return rows.map((r) => r.note_id);
  }

  deleteUnused(): void {
    this.deleteUnusedStmt.run();
  }
}
