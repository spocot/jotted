import type Database from "better-sqlite3";
import { v4 as uuid } from "uuid";
import type { PageResponse } from "../lib/pagination.js";
import { buildPageResponse } from "../lib/pagination.js";
import type { Note } from "./note-repository.js";

export interface Person {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonCreatePayload {
  name: string;
  email?: string;
}

export interface PersonUpdatePayload {
  name?: string;
  email?: string;
}

export interface NotePerson {
  noteId: string;
  personId: string;
  role: string;
  status: string | null;
}

export class PeopleRepository {
  private insertPerson: Database.Statement;
  private updatePerson: Database.Statement;
  private deletePerson: Database.Statement;
  private getPersonById: Database.Statement;
  private getPersonByEmail: Database.Statement;
  private listPeople: Database.Statement;
  private searchPeople: Database.Statement;
  private insertNotePerson: Database.Statement;
  private deleteNotePerson: Database.Statement;
  private deleteNotePeopleByRoleStmt: Database.Statement;
  private notePeopleStmt: Database.Statement;
  private notePeopleByRoleStmt: Database.Statement;
  private getPersonNotesStmt: Database.Statement;
  private getPersonNotesCountStmt: Database.Statement;
  private notePeopleWithPersonStmt: Database.Statement;

  constructor(public db: Database.Database) {
    this.insertPerson = db.prepare(
      "INSERT INTO people (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    );
    this.updatePerson = db.prepare(
      "UPDATE people SET name = ?, email = ?, updated_at = ? WHERE id = ?",
    );
    this.deletePerson = db.prepare("DELETE FROM people WHERE id = ?");
    this.getPersonById = db.prepare(
      "SELECT id, name, email, created_at AS createdAt, updated_at AS updatedAt FROM people WHERE id = ?",
    );
    this.getPersonByEmail = db.prepare(
      "SELECT id, name, email, created_at AS createdAt, updated_at AS updatedAt FROM people WHERE email = ? LIMIT 1",
    );
    this.listPeople = db.prepare(
      "SELECT p.id, p.name, p.email, p.created_at AS createdAt, p.updated_at AS updatedAt, COUNT(np.note_id) AS noteCount FROM people p LEFT JOIN note_people np ON p.id = np.person_id GROUP BY p.id ORDER BY p.name ASC",
    );
    this.searchPeople = db.prepare(
      "SELECT p.id, p.name, p.email, p.created_at AS createdAt, p.updated_at AS updatedAt, COUNT(np.note_id) AS noteCount FROM people p LEFT JOIN note_people np ON p.id = np.person_id WHERE p.name LIKE ? GROUP BY p.id ORDER BY p.name ASC LIMIT 20",
    );
    this.insertNotePerson = db.prepare(
      "INSERT OR IGNORE INTO note_people (note_id, person_id, role, status) VALUES (?, ?, ?, ?)",
    );
    this.deleteNotePerson = db.prepare(
      "DELETE FROM note_people WHERE note_id = ? AND person_id = ? AND role = ?",
    );
    this.deleteNotePeopleByRoleStmt = db.prepare(
      "DELETE FROM note_people WHERE note_id = ? AND role = ?",
    );
    this.notePeopleStmt = db.prepare(
      "SELECT np.note_id AS noteId, np.person_id AS personId, np.role, np.status, p.name, p.email FROM note_people np JOIN people p ON np.person_id = p.id WHERE np.note_id = ? ORDER BY np.role, p.name",
    );
    this.notePeopleByRoleStmt = db.prepare(
      "SELECT np.note_id AS noteId, np.person_id AS personId, np.role, np.status, p.name, p.email FROM note_people np JOIN people p ON np.person_id = p.id WHERE np.note_id = ? AND np.role = ? ORDER BY p.name",
    );
    this.getPersonNotesStmt = db.prepare(`
      SELECT n.id, n.title, n.content, n.path,
        n.note_type AS noteType,
        n.meeting_location AS meetingLocation,
        n.meeting_start AS meetingStart,
        n.meeting_end AS meetingEnd,
        n.ics_uid AS icsUid,
        n.ics_last_synced AS icsLastSynced,
        n.created_at AS createdAt, n.updated_at AS updatedAt,
        np.role, np.status
      FROM notes n
      JOIN note_people np ON n.id = np.note_id
      WHERE np.person_id = ?
      ORDER BY n.updated_at DESC
      LIMIT ? OFFSET ?
    `);
    this.getPersonNotesCountStmt = db.prepare(`
      SELECT COUNT(DISTINCT n.id) AS count
      FROM notes n
      JOIN note_people np ON n.id = np.note_id
      WHERE np.person_id = ?
    `);
    this.notePeopleWithPersonStmt = db.prepare(
      "SELECT np.note_id AS noteId, np.person_id AS personId, np.role, np.status, p.name, p.email FROM note_people np JOIN people p ON np.person_id = p.id WHERE np.note_id = ?",
    );
  }

  create(payload: PersonCreatePayload): Person {
    const id = uuid();
    const now = new Date().toISOString();
    this.insertPerson.run(id, payload.name, payload.email ?? null, now, now);
    return this.getById(id)!;
  }

  update(id: string, payload: PersonUpdatePayload): Person | null {
    const existing = this.getById(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    this.updatePerson.run(
      payload.name ?? existing.name,
      payload.email !== undefined ? payload.email : existing.email,
      now,
      id,
    );
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.deletePerson.run(id);
    return result.changes > 0;
  }

  getById(id: string): Person | null {
    return (this.getPersonById.get(id) as Person | null) ?? null;
  }

  getByEmail(email: string): Person | null {
    return (this.getPersonByEmail.get(email) as Person | null) ?? null;
  }

  upsert(name: string, email?: string): Person {
    if (email) {
      const existing = this.getByEmail(email);
      if (existing) {
        if (existing.name !== name) {
          return this.update(existing.id, { name })!;
        }
        return existing;
      }
    }
    return this.create({ name, email });
  }

  list(): (Person & { noteCount: number })[] {
    return this.listPeople.all() as (Person & { noteCount: number })[];
  }

  search(query: string): (Person & { noteCount: number })[] {
    return this.searchPeople.all(`%${query}%`) as (Person & { noteCount: number })[];
  }

  linkToNote(noteId: string, personId: string, role: string, status?: string): void {
    this.insertNotePerson.run(noteId, personId, role, status ?? null);
  }

  unlinkFromNote(noteId: string, personId: string, role: string): void {
    this.deleteNotePerson.run(noteId, personId, role);
  }

  clearRoleFromNote(noteId: string, role: string): void {
    this.deleteNotePeopleByRoleStmt.run(noteId, role);
  }

  getNotePeople(noteId: string): Array<NotePerson & { name: string; email: string | null }> {
    return this.notePeopleStmt.all(noteId) as Array<NotePerson & { name: string; email: string | null }>;
  }

  getNotePeopleByRole(noteId: string, role: string): Array<NotePerson & { name: string; email: string | null }> {
    return this.notePeopleByRoleStmt.all(noteId, role) as Array<NotePerson & { name: string; email: string | null }>;
  }

  getPersonNotes(personId: string, role?: string, status?: string, limit = 50, offset = 0): PageResponse<Note & { role: string; status: string | null }> {
    let sql = `
      SELECT n.id, n.title, n.content, n.path,
        n.note_type AS noteType,
        n.meeting_location AS meetingLocation,
        n.meeting_start AS meetingStart,
        n.meeting_end AS meetingEnd,
        n.ics_uid AS icsUid,
        n.ics_last_synced AS icsLastSynced,
        n.created_at AS createdAt, n.updated_at AS updatedAt,
        np.role, np.status
      FROM notes n
      JOIN note_people np ON n.id = np.note_id
      WHERE np.person_id = ?
    `;
    const params: unknown[] = [personId];
    if (role) {
      sql += " AND np.role = ?";
      params.push(role);
    }
    if (status) {
      sql += " AND np.status = ?";
      params.push(status);
    }
    sql += " ORDER BY n.updated_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const countSql = sql
      .replace(/SELECT .*? FROM/s, "SELECT COUNT(DISTINCT n.id) AS count FROM")
      .replace(/ORDER BY .*/, "");
    const countResult = this.db.prepare(countSql).get(...params.slice(0, params.length - 2)) as { count: number };

    const items = this.db.prepare(sql).all(...params) as Array<Note & { role: string; status: string | null }>;

    return buildPageResponse(items, countResult.count, limit, offset);
  }

  getRoleCounts(personId: string): { role: string; count: number }[] {
    return this.db
      .prepare(
        "SELECT role, COUNT(DISTINCT note_id) AS count FROM note_people WHERE person_id = ? GROUP BY role",
      )
      .all(personId) as { role: string; count: number }[];
  }

  deletePersonNotesByIcsUid(icsUid: string): void {
    const note = this.db
      .prepare("SELECT id FROM notes WHERE ics_uid = ?")
      .get(icsUid) as { id: string } | undefined;
    if (note) {
      this.db.prepare("DELETE FROM note_people WHERE note_id = ?").run(note.id);
    }
  }
}
