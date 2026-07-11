import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";

export interface Canvas {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CanvasItem {
  id: string;
  canvasId: string;
  noteId: string | null;
  type: "text_box" | "note_pin" | "image" | "rectangle" | "rounded_rectangle" | "circle" | "diamond" | "cylinder" | "cloud" | "hexagon" | "group";
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  createdAt: string;
  lockAspectRatio?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  groupId?: string | null;
  childIds?: string | null;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
}

export interface CanvasEdge {
  id: string;
  canvasId: string;
  sourceItemId: string;
  targetItemId: string;
  type: "straight" | "curved";
  label?: string;
  edgeStyle?: "solid" | "dashed" | "dotted";
  arrowStart?: number;
  arrowEnd?: number;
  createdAt: string;
}

export interface CanvasWithDetails extends Canvas {
  items: CanvasItem[];
  edges: CanvasEdge[];
}

export interface CanvasVersion {
  id: string;
  canvasId: string;
  title: string;
  description: string;
  items: CanvasItem[];
  edges: CanvasEdge[];
  thumbnail?: string;
  createdAt: string;
}

export class CanvasRepository {
  private insertCanvasStmt: Database.Statement;
  private updateCanvasStmt: Database.Statement;
  private deleteCanvasStmt: Database.Statement;
  private getCanvasByIdStmt: Database.Statement;
  private listCanvasesStmt: Database.Statement;
  private insertItemStmt: Database.Statement;
  private updateItemStmt: Database.Statement;
  private deleteItemStmt: Database.Statement;
  private getItemsByCanvasStmt: Database.Statement;
  private getItemByIdStmt: Database.Statement;
  private insertEdgeStmt: Database.Statement;
  private updateEdgeStmt: Database.Statement;
  private deleteEdgeStmt: Database.Statement;
  private getEdgesByCanvasStmt: Database.Statement;
  private getEdgeByIdStmt: Database.Statement;
  private getMaxZIndexStmt: Database.Statement;

  // Group statements
  private insertGroupStmt: Database.Statement;
  private deleteGroupStmt: Database.Statement;
  private getGroupsByCanvasStmt: Database.Statement;
  private getGroupChildrenStmt: Database.Statement;

  // Version statements
  private insertVersionStmt: Database.Statement;
  private deleteVersionStmt: Database.Statement;
  private getVersionsByCanvasStmt: Database.Statement;
  private getVersionByIdStmt: Database.Statement;

  constructor(public db: Database.Database) {
    this.insertCanvasStmt = db.prepare(
      "INSERT INTO canvases (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
    );
    this.updateCanvasStmt = db.prepare(
      "UPDATE canvases SET title = ?, updated_at = ? WHERE id = ?",
    );
    this.deleteCanvasStmt = db.prepare("DELETE FROM canvases WHERE id = ?");
    this.getCanvasByIdStmt = db.prepare(
      "SELECT id, title, created_at AS createdAt, updated_at AS updatedAt FROM canvases WHERE id = ?",
    );
    this.listCanvasesStmt = db.prepare(
      "SELECT id, title, created_at AS createdAt, updated_at AS updatedAt FROM canvases ORDER BY updated_at DESC",
    );
    this.insertItemStmt = db.prepare(
      "INSERT INTO canvas_items (id, canvas_id, note_id, type, text, color, x, y, width, height, z_index, created_at, lock_aspect_ratio, min_width, min_height, max_width, max_height, group_id, child_ids, font_size, font_weight, font_style) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    this.updateItemStmt = db.prepare(
      "UPDATE canvas_items SET note_id = ?, type = ?, text = ?, color = ?, x = ?, y = ?, width = ?, height = ?, z_index = ?, lock_aspect_ratio = ?, min_width = ?, min_height = ?, max_width = ?, max_height = ?, group_id = ?, child_ids = ?, font_size = ?, font_weight = ?, font_style = ? WHERE id = ? AND canvas_id = ?",
    );
    this.deleteItemStmt = db.prepare(
      "DELETE FROM canvas_items WHERE id = ? AND canvas_id = ?",
    );
    this.getItemsByCanvasStmt = db.prepare(
      "SELECT id, canvas_id AS canvasId, note_id AS noteId, type, text, color, x, y, width, height, z_index AS zIndex, created_at AS createdAt, lock_aspect_ratio AS lockAspectRatio, min_width AS minWidth, min_height AS minHeight, max_width AS maxWidth, max_height AS maxHeight, group_id AS groupId, child_ids AS childIds, font_size AS fontSize, font_weight AS fontWeight, font_style AS fontStyle FROM canvas_items WHERE canvas_id = ? ORDER BY z_index ASC",
    );
    this.getItemByIdStmt = db.prepare(
      "SELECT id, canvas_id AS canvasId, note_id AS noteId, type, text, color, x, y, width, height, z_index AS zIndex, created_at AS createdAt, lock_aspect_ratio AS lockAspectRatio, min_width AS minWidth, min_height AS minHeight, max_width AS maxWidth, max_height AS maxHeight, group_id AS groupId, child_ids AS childIds, font_size AS fontSize, font_weight AS fontWeight, font_style AS fontStyle FROM canvas_items WHERE id = ?",
    );
    this.insertEdgeStmt = db.prepare(
      "INSERT INTO canvas_edges (id, canvas_id, source_item_id, target_item_id, type, label, edge_style, arrow_start, arrow_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    this.updateEdgeStmt = db.prepare(
      "UPDATE canvas_edges SET source_item_id = ?, target_item_id = ?, type = ?, label = ?, edge_style = ?, arrow_start = ?, arrow_end = ? WHERE id = ? AND canvas_id = ?",
    );
    this.deleteEdgeStmt = db.prepare(
      "DELETE FROM canvas_edges WHERE id = ? AND canvas_id = ?",
    );
    this.getEdgesByCanvasStmt = db.prepare(
      "SELECT id, canvas_id AS canvasId, source_item_id AS sourceItemId, target_item_id AS targetItemId, type, label, edge_style AS edgeStyle, arrow_start AS arrowStart, arrow_end AS arrowEnd, created_at AS createdAt FROM canvas_edges WHERE canvas_id = ?",
    );
    this.getEdgeByIdStmt = db.prepare(
      "SELECT id, canvas_id AS canvasId, source_item_id AS sourceItemId, target_item_id AS targetItemId, type, label, edge_style AS edgeStyle, arrow_start AS arrowStart, arrow_end AS arrowEnd, created_at AS createdAt FROM canvas_edges WHERE id = ?",
    );
    this.getMaxZIndexStmt = db.prepare(
      "SELECT COALESCE(MAX(z_index), 0) AS maxZ FROM canvas_items WHERE canvas_id = ?",
    );

    // Group statements
    this.insertGroupStmt = db.prepare(
      "INSERT INTO canvas_groups (id, canvas_id, label, created_at) VALUES (?, ?, ?, ?)",
    );
    this.deleteGroupStmt = db.prepare(
      "DELETE FROM canvas_groups WHERE id = ?",
    );
    this.getGroupsByCanvasStmt = db.prepare(
      "SELECT id, canvas_id AS canvasId, label, created_at AS createdAt FROM canvas_groups WHERE canvas_id = ?",
    );
    this.getGroupChildrenStmt = db.prepare(
      "SELECT id FROM canvas_items WHERE group_id = ? AND canvas_id = ?",
    );

    // Version statements
    this.insertVersionStmt = db.prepare(
      "INSERT INTO canvas_versions (id, canvas_id, title, description, items, edges, thumbnail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    );
    this.deleteVersionStmt = db.prepare(
      "DELETE FROM canvas_versions WHERE id = ?",
    );
    this.getVersionsByCanvasStmt = db.prepare(
      "SELECT id, canvas_id AS canvasId, title, description, items, edges, thumbnail, created_at AS createdAt FROM canvas_versions WHERE canvas_id = ? ORDER BY created_at DESC",
    );
    this.getVersionByIdStmt = db.prepare(
      "SELECT id, canvas_id AS canvasId, title, description, items, edges, thumbnail, created_at AS createdAt FROM canvas_versions WHERE id = ?",
    );
  }

  // ---- Canvas CRUD ----

  list(): Canvas[] {
    return this.listCanvasesStmt.all() as Canvas[];
  }

  getById(id: string): Canvas | null {
    return (this.getCanvasByIdStmt.get(id) as Canvas | undefined) ?? null;
  }

  create(title?: string): Canvas {
    const id = uuid();
    const now = new Date().toISOString();
    this.insertCanvasStmt.run(id, title ?? "Untitled Canvas", now, now);
    return this.getById(id)!;
  }

  update(id: string, title: string): Canvas | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    this.updateCanvasStmt.run(title, now, id);
    return this.getById(id)!;
  }

  delete(id: string): boolean {
    const existing = this.getById(id);
    if (!existing) return false;
    this.deleteCanvasStmt.run(id);
    return true;
  }

  getWithDetails(id: string): CanvasWithDetails | null {
    const canvas = this.getById(id);
    if (!canvas) return null;
    const items = this.getItemsByCanvasStmt.all(id) as CanvasItem[];
    const edges = this.getEdgesByCanvasStmt.all(id) as CanvasEdge[];
    return { ...canvas, items, edges };
  }

  // ---- Item CRUD ----

  addItem(
    canvasId: string,
    params: {
      noteId?: string | null;
      type?: "text_box" | "note_pin" | "image" | "rectangle" | "rounded_rectangle" | "circle" | "diamond" | "cylinder" | "cloud" | "hexagon" | "group";
      text?: string;
      color?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      lockAspectRatio?: boolean;
      minWidth?: number;
      minHeight?: number;
      maxWidth?: number;
      maxHeight?: number;
      groupId?: string | null;
      childIds?: string[];
      fontSize?: number;
      fontWeight?: string;
      fontStyle?: string;
    },
  ): CanvasItem | null {
    const canvas = this.getById(canvasId);
    if (!canvas) return null;
    const id = uuid();
    const now = new Date().toISOString();
    const maxZ = (this.getMaxZIndexStmt.get(canvasId) as { maxZ: number }).maxZ;
    this.insertItemStmt.run(
      id,
      canvasId,
      params.noteId ?? null,
      params.type ?? "text_box",
      params.text ?? "",
      params.color ?? "#3b82f6",
      params.x ?? 0,
      params.y ?? 0,
      params.width ?? 200,
      params.height ?? 100,
      maxZ + 1,
      now,
      params.lockAspectRatio ? 1 : 0,
      params.minWidth ?? 0,
      params.minHeight ?? 0,
      params.maxWidth ?? 0,
      params.maxHeight ?? 0,
      params.groupId ?? null,
      params.childIds ? JSON.stringify(params.childIds) : null,
      params.fontSize ?? null,
      params.fontWeight ?? null,
      params.fontStyle ?? null,
    );
    return this.getItemByIdStmt.get(id) as CanvasItem | null;
  }

  updateItem(
    canvasId: string,
    itemId: string,
    params: {
      noteId?: string | null;
      type?: "text_box" | "note_pin" | "image" | "rectangle" | "rounded_rectangle" | "circle" | "diamond" | "cylinder" | "cloud" | "hexagon" | "group";
      text?: string;
      color?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      zIndex?: number;
      lockAspectRatio?: boolean;
      minWidth?: number;
      minHeight?: number;
      maxWidth?: number;
      maxHeight?: number;
      groupId?: string | null;
      childIds?: string[];
      fontSize?: number;
      fontWeight?: string;
      fontStyle?: string;
    },
  ): CanvasItem | null {
    const existing = this.getItemByIdStmt.get(itemId) as CanvasItem | undefined;
    if (!existing) return null;
    this.updateItemStmt.run(
      params.noteId ?? existing.noteId,
      params.type ?? existing.type,
      params.text ?? existing.text,
      params.color ?? existing.color,
      params.x ?? existing.x,
      params.y ?? existing.y,
      params.width ?? existing.width,
      params.height ?? existing.height,
      params.zIndex ?? existing.zIndex,
      params.lockAspectRatio !== undefined ? (params.lockAspectRatio ? 1 : 0) : existing.lockAspectRatio,
      params.minWidth ?? existing.minWidth,
      params.minHeight ?? existing.minHeight,
      params.maxWidth ?? existing.maxWidth,
      params.maxHeight ?? existing.maxHeight,
      params.groupId !== undefined ? params.groupId : existing.groupId,
      params.childIds !== undefined ? (params.childIds ? JSON.stringify(params.childIds) : null) : existing.childIds,
      params.fontSize ?? existing.fontSize,
      params.fontWeight ?? existing.fontWeight,
      params.fontStyle ?? existing.fontStyle,
      itemId,
      canvasId,
    );
    return this.getItemByIdStmt.get(itemId) as CanvasItem | null;
  }

  deleteItem(canvasId: string, itemId: string): boolean {
    const existing = this.getItemByIdStmt.get(itemId) as CanvasItem | undefined;
    if (!existing) return false;
    this.deleteItemStmt.run(itemId, canvasId);
    return true;
  }

  // ---- Edge CRUD ----

  addEdge(
    canvasId: string,
    params: {
      sourceItemId: string;
      targetItemId: string;
      type?: "straight" | "curved";
      label?: string;
      edgeStyle?: "solid" | "dashed" | "dotted";
      arrowStart?: number;
      arrowEnd?: number;
    },
  ): CanvasEdge | null {
    const canvas = this.getById(canvasId);
    if (!canvas) return null;
    const id = uuid();
    const now = new Date().toISOString();
    this.insertEdgeStmt.run(
      id,
      canvasId,
      params.sourceItemId,
      params.targetItemId,
      params.type ?? "straight",
      params.label ?? "",
      params.edgeStyle ?? "solid",
      params.arrowStart ?? 0,
      params.arrowEnd ?? 0,
      now,
    );
    return this.getEdgeByIdStmt.get(id) as CanvasEdge | null;
  }

  updateEdge(
    canvasId: string,
    edgeId: string,
    params: {
      sourceItemId?: string;
      targetItemId?: string;
      type?: "straight" | "curved";
      label?: string;
      edgeStyle?: "solid" | "dashed" | "dotted";
      arrowStart?: number;
      arrowEnd?: number;
    },
  ): CanvasEdge | null {
    const existing = this.getEdgeByIdStmt.get(edgeId) as CanvasEdge | undefined;
    if (!existing) return null;
    this.updateEdgeStmt.run(
      params.sourceItemId ?? existing.sourceItemId,
      params.targetItemId ?? existing.targetItemId,
      params.type ?? existing.type,
      params.label ?? existing.label ?? "",
      params.edgeStyle ?? existing.edgeStyle ?? "solid",
      params.arrowStart !== undefined ? params.arrowStart : (existing.arrowStart ?? 0),
      params.arrowEnd !== undefined ? params.arrowEnd : (existing.arrowEnd ?? 0),
      edgeId,
      canvasId,
    );
    return this.getEdgeByIdStmt.get(edgeId) as CanvasEdge | null;
  }

  deleteEdge(canvasId: string, edgeId: string): boolean {
    const existing = this.getEdgeByIdStmt.get(edgeId) as CanvasEdge | undefined;
    if (!existing) return false;
    this.deleteEdgeStmt.run(edgeId, canvasId);
    return true;
  }

  // ---- Batch update (for auto-save) ----

  batchUpdate(
    canvasId: string,
    data: {
      items?: Array<{
        id: string;
        noteId?: string | null;
        type?: "text_box" | "note_pin" | "image" | "rectangle" | "rounded_rectangle" | "circle" | "diamond" | "cylinder" | "cloud" | "hexagon" | "group";
        text?: string;
        color?: string;
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        zIndex?: number;
        lockAspectRatio?: boolean;
        minWidth?: number;
        minHeight?: number;
        maxWidth?: number;
        maxHeight?: number;
        groupId?: string | null;
        childIds?: string[];
        fontSize?: number;
        fontWeight?: string;
        fontStyle?: string;
      }>;
      edges?: Array<{
        id: string;
        sourceItemId?: string;
        targetItemId?: string;
        type?: "straight" | "curved";
        label?: string;
        edgeStyle?: "solid" | "dashed" | "dotted";
        arrowStart?: number;
        arrowEnd?: number;
      }>;
      deletedItemIds?: string[];
      deletedEdgeIds?: string[];
    },
  ): CanvasWithDetails | null {
    const canvas = this.getById(canvasId);
    if (!canvas) return null;

    const transaction = this.db.transaction(() => {
      if (data.deletedItemIds) {
        for (const itemId of data.deletedItemIds) {
          this.deleteEdgeByItem(canvasId, itemId);
          this.deleteItemStmt.run(itemId, canvasId);
        }
      }
      if (data.deletedEdgeIds) {
        for (const edgeId of data.deletedEdgeIds) {
          this.deleteEdgeStmt.run(edgeId, canvasId);
        }
      }
      if (data.items) {
        for (const item of data.items) {
          const existing = this.getItemByIdStmt.get(item.id) as CanvasItem | undefined;
          if (existing) {
            this.updateItemStmt.run(
              item.noteId ?? existing.noteId,
              item.type ?? existing.type,
              item.text ?? existing.text,
              item.color ?? existing.color,
              item.x ?? existing.x,
              item.y ?? existing.y,
              item.width ?? existing.width,
              item.height ?? existing.height,
              item.zIndex ?? existing.zIndex,
              item.lockAspectRatio !== undefined ? (item.lockAspectRatio ? 1 : 0) : (existing.lockAspectRatio ?? 0),
              item.minWidth ?? existing.minWidth ?? 0,
              item.minHeight ?? existing.minHeight ?? 0,
              item.maxWidth ?? existing.maxWidth ?? 0,
              item.maxHeight ?? existing.maxHeight ?? 0,
              item.groupId ?? existing.groupId ?? null,
              item.childIds ? JSON.stringify(item.childIds) : (existing.childIds ?? null),
              item.fontSize ?? existing.fontSize ?? null,
              item.fontWeight ?? existing.fontWeight ?? null,
              item.fontStyle ?? existing.fontStyle ?? null,
              item.id,
              canvasId,
            );
          } else {
            this.insertItemStmt.run(
              item.id,
              canvasId,
              item.noteId ?? null,
              item.type ?? "text_box",
              item.text ?? "",
              item.color ?? "#3b82f6",
              item.x ?? 0,
              item.y ?? 0,
              item.width ?? 200,
              item.height ?? 100,
              item.zIndex ?? (this.getMaxZIndexStmt.get(canvasId) as { maxZ: number }).maxZ + 1,
              new Date().toISOString(),
              item.lockAspectRatio ? 1 : 0,
              item.minWidth ?? 0,
              item.minHeight ?? 0,
              item.maxWidth ?? 0,
              item.maxHeight ?? 0,
              item.groupId ?? null,
              item.childIds ? JSON.stringify(item.childIds) : null,
              item.fontSize ?? null,
              item.fontWeight ?? null,
              item.fontStyle ?? null,
            );
          }
        }
      }
      if (data.edges) {
        for (const edge of data.edges) {
          const existing = this.getEdgeByIdStmt.get(edge.id) as CanvasEdge | undefined;
          if (existing) {
            this.updateEdgeStmt.run(
              edge.sourceItemId ?? existing.sourceItemId,
              edge.targetItemId ?? existing.targetItemId,
              edge.type ?? existing.type,
              edge.label ?? existing.label ?? "",
              edge.edgeStyle ?? existing.edgeStyle ?? "solid",
              edge.arrowStart !== undefined ? edge.arrowStart : (existing.arrowStart ?? 0),
              edge.arrowEnd !== undefined ? edge.arrowEnd : (existing.arrowEnd ?? 0),
              edge.id,
              canvasId,
            );
          } else {
            this.insertEdgeStmt.run(
              edge.id,
              canvasId,
              edge.sourceItemId ?? "",
              edge.targetItemId ?? "",
              edge.type ?? "straight",
              edge.label ?? "",
              edge.edgeStyle ?? "solid",
              edge.arrowStart ?? 0,
              edge.arrowEnd ?? 0,
              new Date().toISOString(),
            );
          }
        }
      }
      // Update canvas timestamp
      const now = new Date().toISOString();
      this.updateCanvasStmt.run(canvas.title, now, canvasId);
    });
    transaction();
    return this.getWithDetails(canvasId);
  }

  private deleteEdgeByItem(canvasId: string, itemId: string): void {
    const stmt = this.db.prepare(
      "DELETE FROM canvas_edges WHERE canvas_id = ? AND (source_item_id = ? OR target_item_id = ?)",
    );
    stmt.run(canvasId, itemId, itemId);
  }

  // ---- Group Methods ----

  createGroup(canvasId: string, groupId: string, label?: string): void {
    const now = new Date().toISOString();
    this.insertGroupStmt.run(groupId, canvasId, label ?? "", now);
  }

  deleteGroup(groupId: string): void {
    // Clear group_id from children first
    this.db.prepare("UPDATE canvas_items SET group_id = NULL WHERE group_id = ?").run(groupId);
    this.deleteGroupStmt.run(groupId);
  }

  getGroupsByCanvas(canvasId: string): Array<{ id: string; canvasId: string; label: string; createdAt: string }> {
    return this.getGroupsByCanvasStmt.all(canvasId) as Array<{ id: string; canvasId: string; label: string; createdAt: string }>;
  }

  getGroupChildren(groupId: string, canvasId: string): string[] {
    const rows = this.getGroupChildrenStmt.all(groupId, canvasId) as Array<{ id: string }>;
    return rows.map((r) => r.id);
  }

  // ---- Version Methods ----

  createVersion(
    canvasId: string,
    title: string,
    description: string,
    items: CanvasItem[],
    edges: CanvasEdge[],
    thumbnail?: string,
  ): CanvasVersion {
    const id = uuid();
    const now = new Date().toISOString();
    this.insertVersionStmt.run(
      id,
      canvasId,
      title,
      description,
      JSON.stringify(items),
      JSON.stringify(edges),
      thumbnail ?? null,
      now,
    );
    return this.getVersionByIdStmt.get(id) as CanvasVersion;
  }

  deleteVersion(versionId: string): boolean {
    const existing = this.getVersionByIdStmt.get(versionId);
    if (!existing) return false;
    this.deleteVersionStmt.run(versionId);
    return true;
  }

  getVersionsByCanvas(canvasId: string): CanvasVersion[] {
    const rows = this.getVersionsByCanvasStmt.all(canvasId) as Array<CanvasVersion & { items: string; edges: string }>;
    return rows.map((row) => ({
      ...row,
      items: JSON.parse(row.items).map((item: any) => ({
        ...item,
        lockAspectRatio: item.lockAspectRatio === 1 || item.lockAspectRatio === true,
      })),
      edges: JSON.parse(row.edges),
    }));
  }

  getVersionById(versionId: string): CanvasVersion | null {
    const row = this.getVersionByIdStmt.get(versionId) as (CanvasVersion & { items: string; edges: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      items: JSON.parse(row.items).map((item: any) => ({
        ...item,
        lockAspectRatio: item.lockAspectRatio === 1 || item.lockAspectRatio === true,
      })),
      edges: JSON.parse(row.edges),
    };
  }
}
