import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, "../../data");
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "jotted.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      path TEXT NOT NULL DEFAULT '/Unsorted',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (note_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS links (
      source_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      PRIMARY KEY (source_id, target_id)
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
      note_id UNINDEXED,
      title,
      content
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS note_versions (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS canvases (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Canvas',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS canvas_items (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
      note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
      type TEXT NOT NULL DEFAULT 'text_box',
      text TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#3b82f6',
      x REAL NOT NULL DEFAULT 0,
      y REAL NOT NULL DEFAULT 0,
      width REAL NOT NULL DEFAULT 200,
      height REAL NOT NULL DEFAULT 100,
      z_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      lock_aspect_ratio INTEGER NOT NULL DEFAULT 0,
      min_width REAL NOT NULL DEFAULT 0,
      min_height REAL NOT NULL DEFAULT 0,
      max_width REAL NOT NULL DEFAULT 0,
      max_height REAL NOT NULL DEFAULT 0,
      group_id TEXT REFERENCES canvas_groups(id) ON DELETE SET NULL,
      child_ids TEXT
    );

    CREATE TABLE IF NOT EXISTS canvas_groups (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS canvas_versions (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      items TEXT NOT NULL DEFAULT '[]',
      edges TEXT NOT NULL DEFAULT '[]',
      thumbnail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS canvas_edges (
      id TEXT PRIMARY KEY,
      canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
      source_item_id TEXT NOT NULL REFERENCES canvas_items(id) ON DELETE CASCADE,
      target_item_id TEXT NOT NULL REFERENCES canvas_items(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'straight',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Project',
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'planning',
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_groups (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_columns (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES project_groups(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL REFERENCES project_columns(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
      due_date TEXT,
      position REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_artifacts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      group_id TEXT REFERENCES project_groups(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      artifact_type TEXT NOT NULL DEFAULT 'note',
      reference_id TEXT,
      reference_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_labels (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_card_labels (
      card_id TEXT NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
      label_id TEXT NOT NULL REFERENCES project_labels(id) ON DELETE CASCADE,
      PRIMARY KEY (card_id, label_id)
    );

    CREATE TABLE IF NOT EXISTS project_card_checklists (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      done INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_card_comments (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL REFERENCES project_cards(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_milestones (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      due_date TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS project_card_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      default_labels TEXT NOT NULL DEFAULT '[]',
      default_checklist TEXT NOT NULL DEFAULT '[]',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migrate existing notes at root path to /Unsorted
  database.exec("UPDATE notes SET path = '/Unsorted' WHERE path = '/'");

  // Migration v2: make uploads.note_id nullable for canvas images
  const tableInfo = database.pragma("table_info(uploads)") as Array<{ name: string; notnull: number }>;
  const noteIdCol = tableInfo.find((col) => col.name === "note_id");
  if (noteIdCol && noteIdCol.notnull === 1) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS uploads_new (
        id TEXT PRIMARY KEY,
        note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO uploads_new SELECT * FROM uploads;
      DROP TABLE uploads;
      ALTER TABLE uploads_new RENAME TO uploads;
    `);
  }

  // Performance indexes for pagination, filtering, and sorting
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_notes_path ON notes(path);
    CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id, note_id);
    CREATE INDEX IF NOT EXISTS idx_links_target_id ON links(target_id, source_id);
    CREATE INDEX IF NOT EXISTS idx_links_source_id ON links(source_id, target_id);
    CREATE INDEX IF NOT EXISTS idx_note_versions_note_id ON note_versions(note_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_canvas_items_canvas_id ON canvas_items(canvas_id);
    CREATE INDEX IF NOT EXISTS idx_canvas_edges_canvas_id ON canvas_edges(canvas_id);
    CREATE INDEX IF NOT EXISTS idx_canvas_edges_source ON canvas_edges(source_item_id);
    CREATE INDEX IF NOT EXISTS idx_canvas_edges_target ON canvas_edges(target_item_id);
    CREATE INDEX IF NOT EXISTS idx_project_groups_project_id ON project_groups(project_id, position);
    CREATE INDEX IF NOT EXISTS idx_project_columns_group_id ON project_columns(group_id, position);
    CREATE INDEX IF NOT EXISTS idx_project_cards_column_id ON project_cards(column_id, position);
    CREATE INDEX IF NOT EXISTS idx_project_artifacts_project_id ON project_artifacts(project_id, position);
    CREATE INDEX IF NOT EXISTS idx_project_artifacts_group_id ON project_artifacts(group_id, position);
    CREATE INDEX IF NOT EXISTS idx_project_labels_project_id ON project_labels(project_id, position);
    CREATE INDEX IF NOT EXISTS idx_project_card_labels_card_id ON project_card_labels(card_id);
    CREATE INDEX IF NOT EXISTS idx_project_card_labels_label_id ON project_card_labels(label_id);
    CREATE INDEX IF NOT EXISTS idx_project_card_checklists_card_id ON project_card_checklists(card_id, position);
    CREATE INDEX IF NOT EXISTS idx_project_card_comments_card_id ON project_card_comments(card_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_project_card_templates_project_id ON project_card_templates(project_id, position);
    CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id, position);
  `);

  // Migration v4: create templates table
  const templateTableInfo = database.pragma("table_info(templates)") as Array<{ name: string }>;
  if (templateTableInfo.length === 0) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'note',
        name TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
    `);
  }

  // Migration v3: add edge style fields for architecture diagramming
  const edgeTableInfo = database.pragma("table_info(canvas_edges)") as Array<{ name: string }>;
  if (!edgeTableInfo.find((col) => col.name === "label")) {
    database.exec("ALTER TABLE canvas_edges ADD COLUMN label TEXT NOT NULL DEFAULT ''");
  }
  if (!edgeTableInfo.find((col) => col.name === "edge_style")) {
    database.exec("ALTER TABLE canvas_edges ADD COLUMN edge_style TEXT NOT NULL DEFAULT 'solid'");
  }
  if (!edgeTableInfo.find((col) => col.name === "arrow_start")) {
    database.exec("ALTER TABLE canvas_edges ADD COLUMN arrow_start INTEGER NOT NULL DEFAULT 0");
  }
  if (!edgeTableInfo.find((col) => col.name === "arrow_end")) {
    database.exec("ALTER TABLE canvas_edges ADD COLUMN arrow_end INTEGER NOT NULL DEFAULT 0");
  }

  // Migration v6: add shape styling and grouping fields to canvas_items
  const canvasItemTableInfo = database.pragma("table_info(canvas_items)") as Array<{ name: string }>;
  if (!canvasItemTableInfo.find((col) => col.name === "lock_aspect_ratio")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN lock_aspect_ratio INTEGER NOT NULL DEFAULT 0");
  }
  if (!canvasItemTableInfo.find((col) => col.name === "min_width")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN min_width REAL");
  }
  if (!canvasItemTableInfo.find((col) => col.name === "min_height")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN min_height REAL");
  }
  if (!canvasItemTableInfo.find((col) => col.name === "max_width")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN max_width REAL");
  }
  if (!canvasItemTableInfo.find((col) => col.name === "max_height")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN max_height REAL");
  }
  if (!canvasItemTableInfo.find((col) => col.name === "group_id")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN group_id TEXT REFERENCES canvas_items(id) ON DELETE SET NULL");
  }
  if (!canvasItemTableInfo.find((col) => col.name === "font_size")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN font_size INTEGER");
  }
  if (!canvasItemTableInfo.find((col) => col.name === "font_weight")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN font_weight TEXT");
  }
  if (!canvasItemTableInfo.find((col) => col.name === "font_style")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN font_style TEXT");
  }

  // Migration v7: create canvas_groups table for group membership
  const groupTableInfo = database.pragma("table_info(canvas_groups)") as Array<{ name: string }>;
  if (groupTableInfo.length === 0) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS canvas_groups (
        id TEXT PRIMARY KEY REFERENCES canvas_items(id) ON DELETE CASCADE,
        canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
        label TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_canvas_groups_canvas_id ON canvas_groups(canvas_id);
    `);
  }

  // Migration v8: create canvas_versions table for versioning
  const versionTableInfo = database.pragma("table_info(canvas_versions)") as Array<{ name: string }>;
  if (versionTableInfo.length === 0) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS canvas_versions (
        id TEXT PRIMARY KEY,
        canvas_id TEXT NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        items TEXT NOT NULL DEFAULT '[]',
        edges TEXT NOT NULL DEFAULT '[]',
        thumbnail TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_canvas_versions_canvas_id ON canvas_versions(canvas_id);
    `);
  }

  // Migration v5: add color column to project_columns
  const colTableInfo = database.pragma("table_info(project_columns)") as Array<{ name: string }>;
  if (!colTableInfo.find((col) => col.name === "color")) {
    database.exec("ALTER TABLE project_columns ADD COLUMN color TEXT NOT NULL DEFAULT ''");
  }

  // Migration v9: add child_ids column to canvas_items for shape grouping
  const itemTableInfoFinal = database.pragma("table_info(canvas_items)") as Array<{ name: string }>;
  if (!itemTableInfoFinal.find((col) => col.name === "child_ids")) {
    database.exec("ALTER TABLE canvas_items ADD COLUMN child_ids TEXT");
  }
}
