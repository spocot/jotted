import { Router } from "express";
import type { NoteRepository } from "../db/note-repository.js";
import { asyncHandler } from "../lib/async-handler.js";

interface CalendarDay {
  date: string;
  created: Array<{ id: string; title: string; path: string }>;
  modified: Array<{ id: string; title: string; path: string }>;
}

export function createCalendarRouter(
  noteRepo: NoteRepository,
): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const now = new Date();
      const year = parseInt(req.query.year as string, 10) || now.getFullYear();
      const month = parseInt(req.query.month as string, 10) || now.getMonth() + 1;

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const dayMap = new Map<string, CalendarDay>();

      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        dayMap.set(dateStr, { date: dateStr, created: [], modified: [] });
      }

      const createdNotes = noteRepo.getByDateRange(startDate, endDate);
      for (const note of createdNotes) {
        const day = note.createdAt.slice(0, 10);
        const entry = dayMap.get(day);
        if (entry) {
          entry.created.push({ id: note.id, title: note.title, path: note.path });
        }
      }

      const modifiedNotes = noteRepo.getCreatedByDateRange(startDate, endDate);
      for (const note of modifiedNotes) {
        const day = note.updatedAt.slice(0, 10);
        const entry = dayMap.get(day);
        if (entry) {
          entry.modified.push({ id: note.id, title: note.title, path: note.path });
        }
      }

      const days = [...dayMap.values()];
      res.json({ year, month, days });
    }),
  );

  return router;
}
