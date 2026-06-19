import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import type { PageResponse } from "../lib/pagination.js";
import { buildPageResponse } from "../lib/pagination.js";

export interface NoteVersion {
  id: string;
  noteId: string;
  title: string;
  content: string;
  createdAt: string;
}

export class VersionRepository {
  private insertVersion: Database.Statement;
  private getVersionById: Database.Statement;
  private deleteVersionsByNoteId: Database.Statement;

  constructor(private db: Database.Database) {
    this.insertVersion = db.prepare(
      "INSERT INTO note_versions (id, note_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)",
    );
    this.getVersionById = db.prepare(
      "SELECT id, note_id AS noteId, title, content, created_at AS createdAt FROM note_versions WHERE id = ?",
    );
    this.deleteVersionsByNoteId = db.prepare(
      "DELETE FROM note_versions WHERE note_id = ?",
    );
  }

  create(noteId: string, title: string, content: string): NoteVersion {
    const id = uuid();
    const now = new Date().toISOString();
    this.insertVersion.run(id, noteId, title, content, now);
    return this.getById(id)!;
  }

  listByNoteId(noteId: string, limit: number, offset: number): PageResponse<NoteVersion> {
    const countRow = this.db
      .prepare("SELECT COUNT(*) AS count FROM note_versions WHERE note_id = ?")
      .get(noteId) as { count: number };
    const total = countRow.count;

    const items = this.db
      .prepare(
        "SELECT id, note_id AS noteId, title, content, created_at AS createdAt FROM note_versions WHERE note_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      )
      .all(noteId, limit, offset) as NoteVersion[];

    return buildPageResponse(items, total, limit, offset);
  }

  getById(id: string): NoteVersion | null {
    return (this.getVersionById.get(id) as NoteVersion | null) ?? null;
  }

  deleteByNoteId(noteId: string): void {
    this.deleteVersionsByNoteId.run(noteId);
  }
}
