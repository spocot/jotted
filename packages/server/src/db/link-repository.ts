import type Database from "better-sqlite3";

export interface Link {
  sourceId: string;
  targetId: string;
}

export class LinkRepository {
  private deleteLinksStmt: Database.Statement;
  private insertLinkStmt: Database.Statement;
  private getBacklinksStmt: Database.Statement;
  private getAllLinksStmt: Database.Statement;

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

  getAllLinks(): Link[] {
    return this.getAllLinksStmt.all() as Link[];
  }
}
