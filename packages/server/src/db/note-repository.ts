import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import type { PageResponse } from "../lib/pagination.js";
import { buildPageResponse } from "../lib/pagination.js";

export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  noteType: string;
  meetingLocation: string | null;
  meetingStart: string | null;
  meetingEnd: string | null;
  icsUid: string | null;
  icsLastSynced: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteCreatePayload {
  title?: string;
  content?: string;
  path?: string;
  noteType?: string;
  meetingLocation?: string;
  meetingStart?: string;
  meetingEnd?: string;
  icsUid?: string;
  icsLastSynced?: string;
}

export interface NoteUpdatePayload {
  title?: string;
  content?: string;
  path?: string;
  meetingLocation?: string;
  meetingStart?: string;
  meetingEnd?: string;
  icsUid?: string;
  icsLastSynced?: string;
}

export interface NoteListParams {
  limit: number;
  offset: number;
  folder?: string;
  tag?: string;
  sort?: string | null;
  order?: "ASC" | "DESC";
  noteType?: string;
}

export class NoteRepository {
  private insertNote: Database.Statement;
  private insertFts: Database.Statement;
  private updateNote: Database.Statement;
  private updateNoteMeeting: Database.Statement;
  private updateFts: Database.Statement;
  private deleteNote: Database.Statement;
  private deleteFts: Database.Statement;
  private getNoteById: Database.Statement;
  private getNoteByTitle: Database.Statement;
  private getNoteByIcsUid: Database.Statement;
  private findContentContainingStmt: Database.Statement;
  private getByDateRangeStmt: Database.Statement;
  private getCreatedByDateRangeStmt: Database.Statement;
  private titleExistsStmt: Database.Statement;
  private titleExistsExcludeStmt: Database.Statement;
  private dailyNotesStmt: Database.Statement;
  private dailyNotesCountStmt: Database.Statement;
  private notesWithIcsUidStmt: Database.Statement;
  private updateIcsLastSyncedStmt: Database.Statement;

  private static readonly SELECT_COLS = `
    n.id, n.title, n.content, n.path,
    n.note_type AS noteType,
    n.meeting_location AS meetingLocation,
    n.meeting_start AS meetingStart,
    n.meeting_end AS meetingEnd,
    n.ics_uid AS icsUid,
    n.ics_last_synced AS icsLastSynced,
    n.created_at AS createdAt, n.updated_at AS updatedAt
  `;

  constructor(public db: Database.Database) {
    this.insertNote = db.prepare(
      "INSERT INTO notes (id, title, content, path, note_type, meeting_location, meeting_start, meeting_end, ics_uid, ics_last_synced, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    this.insertFts = db.prepare(
      "INSERT INTO notes_fts (note_id, title, content) VALUES (?, ?, ?)",
    );
    this.updateNote = db.prepare(
      "UPDATE notes SET title = ?, content = ?, path = ?, updated_at = ? WHERE id = ?",
    );
    this.updateNoteMeeting = db.prepare(
      "UPDATE notes SET meeting_location = ?, meeting_start = ?, meeting_end = ?, ics_last_synced = ?, updated_at = ? WHERE id = ?",
    );
    this.updateFts = db.prepare(
      "UPDATE notes_fts SET title = ?, content = ? WHERE note_id = ?",
    );
    this.deleteNote = db.prepare("DELETE FROM notes WHERE id = ?");
    this.deleteFts = db.prepare("DELETE FROM notes_fts WHERE note_id = ?");
    this.getNoteById = db.prepare(
      `SELECT ${NoteRepository.SELECT_COLS} FROM notes n WHERE n.id = ?`,
    );
    this.getNoteByTitle = db.prepare(
      `SELECT ${NoteRepository.SELECT_COLS} FROM notes n WHERE n.title = ? LIMIT 1`,
    );
    this.getNoteByIcsUid = db.prepare(
      `SELECT ${NoteRepository.SELECT_COLS} FROM notes n WHERE n.ics_uid = ? LIMIT 1`,
    );
    this.findContentContainingStmt = db.prepare(
      `SELECT ${NoteRepository.SELECT_COLS} FROM notes n WHERE n.content LIKE ? ORDER BY n.updated_at DESC`,
    );
    this.getByDateRangeStmt = db.prepare(
      `SELECT ${NoteRepository.SELECT_COLS} FROM notes n WHERE date(n.created_at) >= ? AND date(n.created_at) <= ? ORDER BY n.created_at ASC`,
    );
    this.getCreatedByDateRangeStmt = db.prepare(
      `SELECT ${NoteRepository.SELECT_COLS} FROM notes n WHERE date(n.updated_at) >= ? AND date(n.updated_at) <= ? ORDER BY n.updated_at ASC`,
    );
    this.titleExistsStmt = db.prepare("SELECT 1 FROM notes WHERE title = ?");
    this.titleExistsExcludeStmt = db.prepare("SELECT 1 FROM notes WHERE title = ? AND id != ?");
    this.dailyNotesStmt = db.prepare(
      `SELECT ${NoteRepository.SELECT_COLS} FROM notes n WHERE n.title GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' ORDER BY n.title DESC LIMIT ? OFFSET ?`,
    );
    this.dailyNotesCountStmt = db.prepare(
      "SELECT COUNT(*) AS count FROM notes WHERE title GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'",
    );
    this.notesWithIcsUidStmt = db.prepare(
      `SELECT ${NoteRepository.SELECT_COLS} FROM notes n WHERE n.ics_uid IS NOT NULL`,
    );
    this.updateIcsLastSyncedStmt = db.prepare(
      "UPDATE notes SET ics_last_synced = ?, updated_at = ? WHERE id = ?",
    );
  }

  list(params: NoteListParams): PageResponse<Note> {
    const { folder, tag, sort, order, limit, offset, noteType } = params;

    const joins: string[] = [];
    const conditions: string[] = [];
    const queryParams: unknown[] = [];

    if (folder) {
      conditions.push("n.path = ?");
      queryParams.push(folder);
    }

    if (tag) {
      joins.push("JOIN note_tags nt ON n.id = nt.note_id");
      joins.push("JOIN tags t ON nt.tag_id = t.id");
      conditions.push("t.name = ?");
      queryParams.push(tag);
    }

    if (noteType) {
      conditions.push("n.note_type = ?");
      queryParams.push(noteType);
    }

    const fromClause = `FROM notes n ${joins.join(" ")}`;
    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    let sortColumn = "n.updated_at";
    const sortDir = order === "ASC" ? "ASC" : "DESC";
    if (sort === "title") sortColumn = "n.title";
    else if (sort === "createdAt") sortColumn = "n.created_at";

    const hasJoins = joins.length > 0;
    const countSql = `SELECT ${hasJoins ? "COUNT(DISTINCT n.id)" : "COUNT(*)"} ${fromClause} ${whereClause}`;
    const countResult = this.db.prepare(countSql).get(...queryParams) as Record<string, number>;
    const total = Number(Object.values(countResult)[0]);

    const dataSql = `
      SELECT ${NoteRepository.SELECT_COLS}
      ${fromClause} ${whereClause}
      ORDER BY ${sortColumn} ${sortDir}
      LIMIT ? OFFSET ?
    `;
    const items = this.db.prepare(dataSql).all(...queryParams, limit, offset) as Note[];

    return buildPageResponse(items, total, limit, offset);
  }

  getPathsWithCounts(): { path: string; count: number }[] {
    return this.db
      .prepare("SELECT path, COUNT(*) AS count FROM notes GROUP BY path ORDER BY path")
      .all() as { path: string; count: number }[];
  }

  getIdsAndPathsByPathPrefix(prefix: string): { id: string; path: string }[] {
    return this.db
      .prepare("SELECT id, path FROM notes WHERE path = ? OR path LIKE ?")
      .all(prefix, prefix + "/%") as { id: string; path: string }[];
  }

  findByContentContaining(substring: string): Note[] {
    return this.findContentContainingStmt.all(`%${substring}%`) as Note[];
  }

  getByDateRange(startDate: string, endDate: string): Note[] {
    return this.getByDateRangeStmt.all(startDate, endDate) as Note[];
  }

  getCreatedByDateRange(startDate: string, endDate: string): Note[] {
    return this.getCreatedByDateRangeStmt.all(startDate, endDate) as Note[];
  }

  getById(id: string): Note | null {
    return (this.getNoteById.get(id) as Note | null) ?? null;
  }

  getByTitle(title: string): Note | null {
    return (this.getNoteByTitle.get(title) as Note | null) ?? null;
  }

  titleExists(title: string, excludeId?: string): boolean {
    if (excludeId) {
      return !!this.titleExistsExcludeStmt.get(title, excludeId);
    }
    return !!this.titleExistsStmt.get(title);
  }

  getDailyNotes(limit: number, offset: number): PageResponse<Note> {
    const items = this.dailyNotesStmt.all(limit, offset) as Note[];
    const countRow = this.dailyNotesCountStmt.get() as { count: number };
    return buildPageResponse(items, countRow.count, limit, offset);
  }

  getDailyStreak(): number {
    const titles = this.db
      .prepare(
        "SELECT title FROM notes WHERE title GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' ORDER BY title DESC",
      )
      .all() as { title: string }[];

    const today = new Date().toISOString().slice(0, 10);
    let streak = 0;
    let expected = today;

    for (const row of titles) {
      if (row.title === expected) {
        streak++;
        const d = new Date(expected);
        d.setDate(d.getDate() - 1);
        expected = d.toISOString().slice(0, 10);
      } else if (row.title < expected) {
        break;
      }
    }

    return streak;
  }

  create(payload: NoteCreatePayload): Note {
    const id = uuid();
    const now = new Date().toISOString();
    const title = payload.title ?? "";
    const content = payload.content ?? "";
    const noteType = payload.noteType ?? "note";
    const meetingLocation = payload.meetingLocation ?? null;
    const meetingStart = payload.meetingStart ?? null;
    const meetingEnd = payload.meetingEnd ?? null;
    const icsUid = payload.icsUid ?? null;
    const icsLastSynced = payload.icsLastSynced ?? null;

    const transaction = this.db.transaction(() => {
      this.insertNote.run(
        id, title, content, payload.path ?? "/Unsorted",
        noteType, meetingLocation, meetingStart, meetingEnd,
        icsUid, icsLastSynced, now, now,
      );
      this.insertFts.run(id, title, content);
    });
    transaction();

    return this.getById(id)!;
  }

  getByIcsUid(icsUid: string): Note | null {
    return (this.getNoteByIcsUid.get(icsUid) as Note | null) ?? null;
  }

  getNotesWithIcsUid(): Note[] {
    return this.notesWithIcsUidStmt.all() as Note[];
  }

  updateMeetingFields(
    id: string,
    fields: { meetingLocation?: string; meetingStart?: string; meetingEnd?: string; icsLastSynced?: string },
  ): Note | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    this.updateNoteMeeting.run(
      fields.meetingLocation ?? existing.meetingLocation,
      fields.meetingStart ?? existing.meetingStart,
      fields.meetingEnd ?? existing.meetingEnd,
      fields.icsLastSynced ?? existing.icsLastSynced,
      now,
      id,
    );
    return this.getById(id);
  }

  update(id: string, payload: NoteUpdatePayload): Note | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const title = payload.title ?? existing.title;
    const content = payload.content ?? existing.content;

    const transaction = this.db.transaction(() => {
      this.updateNote.run(title, content, payload.path ?? existing.path, now, id);
      this.updateFts.run(title, content, id);
    });
    transaction();

    return this.getById(id)!;
  }

  delete(id: string): boolean {
    const transaction = this.db.transaction(() => {
      this.deleteFts.run(id);
      this.deleteNote.run(id);
    });
    transaction();
    return true;
  }
}
