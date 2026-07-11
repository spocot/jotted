import { Router } from "express";
import { getDb } from "../db/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { NotFound, BadRequest } from "../lib/errors.js";
import { clampLimit } from "../lib/pagination.js";

const INQUIRY_DEFAULT_LIMIT = 50;
const INQUIRY_MAX_LIMIT = 500;

const EXCLUDED_TABLE_PATTERNS = [
  /^sqlite_/,
  /_fts$/,
  /_fts_content$/,
  /_fts_idx$/,
  /_fts_data$/,
  /_fts_docsize$/,
  /_fts_config$/,
];

function isExcludedTable(name: string): boolean {
  return EXCLUDED_TABLE_PATTERNS.some((p) => p.test(name));
}

function getUserTables(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as { name: string }[];
  return rows
    .map((r) => r.name)
    .filter((n) => !isExcludedTable(n));
}

interface TableColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

function validateTable(table: string): TableColumn[] {
  const db = getDb();
  const exists = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  if (!exists) throw new NotFound("Table not found");
  if (isExcludedTable(table)) throw new BadRequest("Table is not user-facing");

  return db.prepare(`PRAGMA table_info("${table}")`).all() as TableColumn[];
}

function findPkColumn(columns: TableColumn[]): TableColumn | undefined {
  return columns.find((c) => c.pk > 0);
}

export function createInquiryRouter(): Router {
  const router = Router();

  router.get(
    "/tables",
    asyncHandler(async (_req, res) => {
      res.json(getUserTables());
    }),
  );

  router.get(
    "/tables/:table/schema",
    asyncHandler(async (req, res) => {
      const columns = validateTable(req.params.table as string);
      res.json(columns);
    }),
  );

  router.get(
    "/tables/:table/rows",
    asyncHandler(async (req, res) => {
      const db = getDb();
      const table = req.params.table as string;
      const columns = validateTable(table);
      const columnNames = columns.map((c) => c.name);

      const limit = clampLimit(req.query.limit, INQUIRY_DEFAULT_LIMIT, INQUIRY_MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const sort = req.query.sort as string | undefined;
      const order =
        (req.query.order as string)?.toUpperCase() === "ASC" ? "ASC" : "DESC";

      let orderClause = `ORDER BY rowid ${order}`;
      if (sort && columnNames.includes(sort)) {
        orderClause = `ORDER BY "${sort}" ${order}`;
      }

      const rows = db
        .prepare(`SELECT *, rowid FROM "${table}" ${orderClause} LIMIT ? OFFSET ?`)
        .all(limit, offset) as Record<string, unknown>[];

      const countRow = db
        .prepare(`SELECT COUNT(*) as count FROM "${table}"`)
        .get() as { count: number };

      const total = countRow.count;

      res.json({
        items: rows,
        total,
        hasMore: offset + limit < total,
      });
    }),
  );

  router.get(
    "/tables/:table/rows/:rowKey",
    asyncHandler(async (req, res) => {
      const db = getDb();
      const table = req.params.table as string;
      const rowKey = req.params.rowKey as string;
      const columns = validateTable(table);

      const pkColumn = findPkColumn(columns);

      let row: Record<string, unknown> | undefined;
      if (pkColumn) {
        row = db
          .prepare(`SELECT *, rowid FROM "${table}" WHERE "${pkColumn.name}" = ?`)
          .get(rowKey) as Record<string, unknown> | undefined;
      } else {
        row = db
          .prepare(`SELECT *, rowid FROM "${table}" WHERE rowid = ?`)
          .get(rowKey) as Record<string, unknown> | undefined;
      }

      if (!row) throw new NotFound("Row not found");
      res.json(row);
    }),
  );

  return router;
}
