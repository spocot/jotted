import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreatePayload {
  title?: string;
  content?: string;
  path?: string;
}

export interface NoteUpdatePayload {
  title?: string;
  content?: string;
  path?: string;
}

export class NoteRepository {
  private insertNote: Database.Statement;
  private insertFts: Database.Statement;
  private updateNote: Database.Statement;
  private updateFts: Database.Statement;
  private deleteNote: Database.Statement;
  private deleteFts: Database.Statement;
  private getNoteById: Database.Statement;
  private getAllNotes: Database.Statement;

  constructor(private db: Database.Database) {
    this.insertNote = db.prepare(
      "INSERT INTO notes (id, title, content, path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    );
    this.insertFts = db.prepare(
      "INSERT INTO notes_fts (note_id, title, content) VALUES (?, ?, ?)",
    );
    this.updateNote = db.prepare(
      "UPDATE notes SET title = ?, content = ?, path = ?, updated_at = ? WHERE id = ?",
    );
    this.updateFts = db.prepare(
      "UPDATE notes_fts SET title = ?, content = ? WHERE note_id = ?",
    );
    this.deleteNote = db.prepare("DELETE FROM notes WHERE id = ?");
    this.deleteFts = db.prepare("DELETE FROM notes_fts WHERE note_id = ?");
    this.getNoteById = db.prepare(
      "SELECT id, title, content, path, created_at AS createdAt, updated_at AS updatedAt FROM notes WHERE id = ?",
    );
    this.getAllNotes = db.prepare(
      "SELECT id, title, content, path, created_at AS createdAt, updated_at AS updatedAt FROM notes ORDER BY updated_at DESC",
    );
  }

  getAll(): Note[] {
    return this.getAllNotes.all() as Note[];
  }

  getById(id: string): Note | null {
    return (this.getNoteById.get(id) as Note | null) ?? null;
  }

  create(payload: NoteCreatePayload): Note {
    const id = uuid();
    const now = new Date().toISOString();
    const title = payload.title ?? "";
    const content = payload.content ?? "";

    const transaction = this.db.transaction(() => {
      this.insertNote.run(id, title, content, payload.path ?? "/", now, now);
      this.insertFts.run(id, title, content);
    });
    transaction();

    return this.getById(id)!;
  }

  update(id: string, payload: NoteUpdatePayload): Note | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const title = payload.title ?? existing.title;
    const content = payload.content ?? existing.content;

    const transaction = this.db.transaction(() => {
      this.updateNote.run(title, content, payload.path ?? existing.path, now, id);
      this.updateFts.run(title, content, id);
    });
    transaction();

    return this.getById(id)!;
  }

  delete(id: string): boolean {
    const transaction = this.db.transaction(() => {
      this.deleteFts.run(id);
      this.deleteNote.run(id);
    });
    transaction();
    return true;
  }
}
