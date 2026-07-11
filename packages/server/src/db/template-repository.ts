import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface Template {
  id: string;
  type: "note" | "project";
  name: string;
  description: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteTemplateContent {
  title: string;
  body: string;
  tags: string[];
  folder: string;
}

export interface ProjectTemplateGroupColumn {
  name: string;
  color: string;
}

export interface ProjectTemplateGroup {
  name: string;
  columns: ProjectTemplateGroupColumn[];
  artifacts: Array<{ name: string; type: string }>;
}

export interface ProjectTemplateContent {
  groups: ProjectTemplateGroup[];
}

export class TemplateRepository {
  private insertStmt: Database.Statement;
  private updateStmt: Database.Statement;
  private deleteStmt: Database.Statement;
  private getByIdStmt: Database.Statement;
  private listByTypeStmt: Database.Statement;
  private listAllStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO templates (id, type, name, description, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateStmt = db.prepare(`
      UPDATE templates SET type = ?, name = ?, description = ?, content = ?, updated_at = ?
      WHERE id = ?
    `);
    this.deleteStmt = db.prepare("DELETE FROM templates WHERE id = ?");
    this.getByIdStmt = db.prepare("SELECT * FROM templates WHERE id = ?");
    this.listByTypeStmt = db.prepare("SELECT * FROM templates WHERE type = ? ORDER BY name ASC");
    this.listAllStmt = db.prepare("SELECT * FROM templates ORDER BY type, name ASC");
  }

  list(type?: "note" | "project"): Template[] {
    if (type) {
      return this.listByTypeStmt.all(type) as Template[];
    }
    return this.listAllStmt.all() as Template[];
  }

  getById(id: string): Template | undefined {
    return this.getByIdStmt.get(id) as Template | undefined;
  }

  create(params: { type: "note" | "project"; name: string; description?: string; content: string }): Template {
    const id = uuid();
    const now = new Date().toISOString();
    this.insertStmt.run(id, params.type, params.name, params.description ?? "", params.content, now, now);
    return this.getById(id) as Template;
  }

  update(id: string, params: { type?: "note" | "project"; name?: string; description?: string; content?: string }): Template | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    this.updateStmt.run(
      params.type ?? existing.type,
      params.name ?? existing.name,
      params.description ?? existing.description,
      params.content ?? existing.content,
      now,
      id,
    );
    return this.getById(id) as Template;
  }

  delete(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;
    this.deleteStmt.run(id);
    return true;
  }
}
