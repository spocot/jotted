import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface SmartFolder {
  id: string;
  name: string;
  queryJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface SmartFolderCreatePayload {
  name: string;
  queryJson?: string;
}

export class SmartFolderRepository {
  private insertStmt: Database.Statement;
  private updateStmt: Database.Statement;
  private deleteStmt: Database.Statement;
  private getByIdStmt: Database.Statement;
  private listStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO smart_folders (id, name, query_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    this.updateStmt = db.prepare(`
      UPDATE smart_folders SET name = ?, query_json = ?, updated_at = ? WHERE id = ?
    `);
    this.deleteStmt = db.prepare("DELETE FROM smart_folders WHERE id = ?");
    this.getByIdStmt = db.prepare(
      "SELECT id, name, query_json AS queryJson, created_at AS createdAt, updated_at AS updatedAt FROM smart_folders WHERE id = ?",
    );
    this.listStmt = db.prepare(
      "SELECT id, name, query_json AS queryJson, created_at AS createdAt, updated_at AS updatedAt FROM smart_folders ORDER BY name ASC",
    );
  }

  list(): SmartFolder[] {
    return this.listStmt.all() as SmartFolder[];
  }

  getById(id: string): SmartFolder | undefined {
    return this.getByIdStmt.get(id) as SmartFolder | undefined;
  }

  create(payload: SmartFolderCreatePayload): SmartFolder {
    const id = uuid();
    const now = new Date().toISOString();
    this.insertStmt.run(id, payload.name, payload.queryJson ?? "{}", now, now);
    return this.getById(id) as SmartFolder;
  }

  update(id: string, payload: { name?: string; queryJson?: string }): SmartFolder | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    this.updateStmt.run(
      payload.name ?? existing.name,
      payload.queryJson ?? existing.queryJson,
      now,
      id,
    );
    return this.getById(id) as SmartFolder;
  }

  delete(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;
    this.deleteStmt.run(id);
    return true;
  }
}
