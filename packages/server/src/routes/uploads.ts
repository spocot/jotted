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

const ALLOWED_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|ico|pdf|docx?|xlsx?|pptx?|txt|csv|md|rtf|zip|tar|gz|bz2|7z|js|ts|tsx|jsx|py|rb|go|rs|java|c|cpp|h|json|ya?ml|xml|html|css|sql|sh|toml|mp[34]|wav|ogg|webm|mov|avi|flac|epub|mobi)$/i;

const BLOCKED_EXTENSIONS = /\.(exe|dll|so|dylib|bat|cmd|ps1|msi|app|dmg|scr|php|aspx?|jsp|cgi|pl)$/i;

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ext = extname(file.originalname);
    if (BLOCKED_EXTENSIONS.test(ext)) {
      cb(new Error("File type not allowed"));
    } else if (ALLOWED_EXTENSIONS.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

export function createUploadsRouter(db: Database.Database): Router {
  const router = Router();

  router.get("/", (req: Request, res: Response) => {
    const stmt = db.prepare(
      `SELECT u.id, u.filename, u.original_name, u.mime_type, u.size, u.created_at, u.note_id, n.title AS note_title
       FROM uploads u LEFT JOIN notes n ON u.note_id = n.id
       ORDER BY u.created_at DESC`,
    );
    const rows = stmt.all() as Array<{
      id: string;
      filename: string;
      original_name: string;
      mime_type: string;
      size: number;
      created_at: string;
      note_id: string | null;
      note_title: string | null;
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
        noteId: r.note_id,
        noteTitle: r.note_title,
      })),
    );
  });

  router.post("/", upload.single("file"), (req: Request, res: Response) => {
    const { noteId } = req.body;
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const id = uuid();
    const stmt = db.prepare(
      `INSERT INTO uploads (id, note_id, filename, original_name, mime_type, size)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    stmt.run(
      id,
      noteId || null,
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
      `SELECT u.id, u.filename, u.original_name, u.mime_type, u.size, u.created_at, u.note_id, n.title AS note_title
       FROM uploads u LEFT JOIN notes n ON u.note_id = n.id
       WHERE u.note_id = ? ORDER BY u.created_at DESC`,
    );
    const rows = stmt.all(noteId) as Array<{
      id: string;
      filename: string;
      original_name: string;
      mime_type: string;
      size: number;
      created_at: string;
      note_id: string | null;
      note_title: string | null;
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
        noteId: r.note_id,
        noteTitle: r.note_title,
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
