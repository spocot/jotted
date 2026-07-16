import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface IntegrationLink {
  id: string;
  entityType: string;
  entityId: string;
  integrationType: string;
  externalId: string;
  externalUrl: string;
  title: string | null;
  metaJson: string | null;
  syncedAt: string | null;
  createdAt: string;
}

export interface IntegrationLinkCreatePayload {
  entityType: string;
  entityId: string;
  integrationType: string;
  externalId: string;
  externalUrl: string;
  title?: string;
  metaJson?: string;
}

export class IntegrationLinkRepository {
  private insertStmt: Database.Statement;
  private deleteStmt: Database.Statement;
  private getByIdStmt: Database.Statement;
  private getByEntityStmt: Database.Statement;
  private updateMetaStmt: Database.Statement;

  constructor(private db: Database.Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO integration_links (id, entity_type, entity_id, integration_type, external_id, external_url, title, meta_json, synced_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.deleteStmt = db.prepare("DELETE FROM integration_links WHERE id = ?");
    this.getByIdStmt = db.prepare(`
      SELECT
        id, entity_type AS entityType, entity_id AS entityId,
        integration_type AS integrationType, external_id AS externalId,
        external_url AS externalUrl, title, meta_json AS metaJson,
        synced_at AS syncedAt, created_at AS createdAt
      FROM integration_links WHERE id = ?
    `);
    this.getByEntityStmt = db.prepare(`
      SELECT
        id, entity_type AS entityType, entity_id AS entityId,
        integration_type AS integrationType, external_id AS externalId,
        external_url AS externalUrl, title, meta_json AS metaJson,
        synced_at AS syncedAt, created_at AS createdAt
      FROM integration_links
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at ASC
    `);
    this.updateMetaStmt = db.prepare(`
      UPDATE integration_links
      SET title = ?, meta_json = ?, synced_at = ?, external_url = ?
      WHERE id = ?
    `);
  }

  getByEntity(entityType: string, entityId: string): IntegrationLink[] {
    return this.getByEntityStmt.all(entityType, entityId) as IntegrationLink[];
  }

  getById(id: string): IntegrationLink | undefined {
    return this.getByIdStmt.get(id) as IntegrationLink | undefined;
  }

  create(payload: IntegrationLinkCreatePayload): IntegrationLink {
    const id = uuid();
    const now = new Date().toISOString();
    this.insertStmt.run(
      id,
      payload.entityType,
      payload.entityId,
      payload.integrationType,
      payload.externalId,
      payload.externalUrl,
      payload.title ?? null,
      payload.metaJson ?? null,
      now,
      now,
    );
    return this.getById(id) as IntegrationLink;
  }

  updateMeta(
    id: string,
    data: { title?: string; metaJson?: string; externalUrl?: string },
  ): IntegrationLink | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    this.updateMetaStmt.run(
      data.title ?? existing.title,
      data.metaJson ?? existing.metaJson,
      now,
      data.externalUrl ?? existing.externalUrl,
      id,
    );
    return this.getById(id) as IntegrationLink;
  }

  delete(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;
    this.deleteStmt.run(id);
    return true;
  }
}
