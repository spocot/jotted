import type Database from "better-sqlite3";
import type { PageResponse } from "../lib/pagination.js";
import { buildPageResponse } from "../lib/pagination.js";
import type { Note } from "./note-repository.js";

export interface Link {
  sourceId: string;
  targetId: string;
}

export class LinkRepository {
  private deleteLinksStmt: Database.Statement;
  private insertLinkStmt: Database.Statement;
  private getBacklinksStmt: Database.Statement;
  private getAllLinksStmt: Database.Statement;
  private backlinkCountsStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.deleteLinksStmt = db.prepare("DELETE FROM links WHERE source_id = ?");
    this.insertLinkStmt = db.prepare(
      "INSERT OR IGNORE INTO links (source_id, target_id) VALUES (?, ?)",
    );
    this.getBacklinksStmt = db.prepare(
      "SELECT source_id FROM links WHERE target_id = ?",
    );
    this.getAllLinksStmt = db.prepare(
      "SELECT source_id AS sourceId, target_id AS targetId FROM links",
    );
    this.backlinkCountsStmt = db.prepare(
      "SELECT target_id AS noteId, COUNT(*) AS count FROM links GROUP BY target_id",
    );
  }

  setLinks(sourceId: string, targetIds: string[]): void {
    const transaction = this.db.transaction(() => {
      this.deleteLinksStmt.run(sourceId);
      for (const targetId of targetIds) {
        this.insertLinkStmt.run(sourceId, targetId);
      }
    });
    transaction();
  }

  getBacklinks(noteId: string): string[] {
    const rows = this.getBacklinksStmt.all(noteId) as { source_id: string }[];
    return rows.map((r) => r.source_id);
  }

  getBacklinksPaginated(
    noteId: string,
    limit: number,
    offset: number,
  ): PageResponse<string> {
    const countRow = this.db
      .prepare("SELECT COUNT(*) AS count FROM links WHERE target_id = ?")
      .get(noteId) as { count: number };
    const total = countRow.count;

    const rows = this.db
      .prepare(
        "SELECT source_id FROM links WHERE target_id = ? ORDER BY source_id LIMIT ? OFFSET ?",
      )
      .all(noteId, limit, offset) as { source_id: string }[];
    const items = rows.map((r) => r.source_id);

    return buildPageResponse(items, total, limit, offset);
  }

  getBacklinkNotes(
    noteId: string,
    limit: number,
    offset: number,
  ): PageResponse<Note> {
    const countRow = this.db
      .prepare("SELECT COUNT(*) AS count FROM links WHERE target_id = ?")
      .get(noteId) as { count: number };
    const total = countRow.count;

    const items = this.db
      .prepare(
        `SELECT n.id, n.title, n.content, n.path, n.created_at AS createdAt, n.updated_at AS updatedAt
         FROM notes n
         JOIN links l ON n.id = l.source_id
         WHERE l.target_id = ?
         ORDER BY n.updated_at DESC
         LIMIT ? OFFSET ?`,
      )
      .all(noteId, limit, offset) as Note[];

    return buildPageResponse(items, total, limit, offset);
  }

  getLinksForNote(noteId: string): Link[] {
    return this.db
      .prepare(
        "SELECT source_id AS sourceId, target_id AS targetId FROM links WHERE source_id = ? OR target_id = ?",
      )
      .all(noteId, noteId) as Link[];
  }

  getOutgoingLinks(noteId: string): Link[] {
    return this.db
      .prepare(
        "SELECT source_id AS sourceId, target_id AS targetId FROM links WHERE source_id = ?",
      )
      .all(noteId) as Link[];
  }

  getAllLinks(): Link[] {
    return this.getAllLinksStmt.all() as Link[];
  }

  getBacklinkCounts(): Record<string, number> {
    const rows = this.backlinkCountsStmt.all() as { noteId: string; count: number }[];
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.noteId] = row.count;
    }
    return result;
  }
}
