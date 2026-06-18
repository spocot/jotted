import { Router } from "express";
import { v4 as uuid } from "uuid";
import multer from "multer";
import { extname, join } from "node:path";
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import type { Request, Response } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOADS_DIR = process.env.UPLOADS_DIR || join(__dirname, "../../uploads");

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
    if (allowed.test(extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export function createUploadsRouter(db: Database.Database): Router {
  const router = Router();

  router.post("/", upload.single("file"), (req: Request, res: Response) => {
    const { noteId } = req.body;
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }
    if (!noteId) {
      res.status(400).json({ error: "noteId is required" });
      return;
    }

    const id = uuid();
    const stmt = db.prepare(
      `INSERT INTO uploads (id, note_id, filename, original_name, mime_type, size)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      id,
      noteId,
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
    );

    res.json({
      id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
    });
  });

  router.get("/:noteId", (req: Request, res: Response) => {
    const { noteId } = req.params;
    const stmt = db.prepare(
      `SELECT id, filename, original_name, mime_type, size, created_at
       FROM uploads WHERE note_id = ? ORDER BY created_at DESC`,
    );
    const rows = stmt.all(noteId) as Array<{
      id: string;
      filename: string;
      original_name: string;
      mime_type: string;
      size: number;
      created_at: string;
    }>;
    res.json(
      rows.map((r) => ({
        id: r.id,
        filename: r.filename,
        originalName: r.original_name,
        mimeType: r.mime_type,
        size: r.size,
        url: `/uploads/${r.filename}`,
        createdAt: r.created_at,
      })),
    );
  });

  router.delete("/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const find = db.prepare("SELECT filename FROM uploads WHERE id = ?");
    const row = find.get(id) as { filename: string } | undefined;
    if (!row) {
      res.status(404).json({ error: "Upload not found" });
      return;
    }
    const filePath = join(UPLOADS_DIR, row.filename);
    try {
      unlinkSync(filePath);
    } catch {
      // file may already be gone
    }
    db.prepare("DELETE FROM uploads WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  return router;
}
