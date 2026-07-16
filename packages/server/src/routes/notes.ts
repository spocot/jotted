import { Router } from "express";
import type { NoteRepository, NoteCreatePayload } from "../db/note-repository.js";
import type { TagRepository } from "../db/tag-repository.js";
import type { LinkRepository } from "../db/link-repository.js";
import type { VersionRepository } from "../db/version-repository.js";
import type { PeopleRepository } from "../db/people-repository.js";
import { parseContent } from "../parser/index.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, Conflict, NotFound } from "../lib/errors.js";
import {
  clampLimit,
  parseSort,
  parseOrder,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  BACKLINK_DEFAULT_LIMIT,
} from "../lib/pagination.js";

export function createNotesRouter(
  noteRepo: NoteRepository,
  tagRepo: TagRepository,
  linkRepo: LinkRepository,
  versionRepo?: VersionRepository,
  peopleRepo?: PeopleRepository,
): Router {
  const router = Router();

  router.get(
    "/backlink-counts",
    asyncHandler(async (_req, res) => {
      res.json(linkRepo.getBacklinkCounts());
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const { folder, tag, sort, order, limit, offset, note_type, title } = req.query;
      const result = noteRepo.list({
        limit: clampLimit(limit, DEFAULT_LIMIT, MAX_LIMIT),
        offset: Math.max(0, Number(offset) || 0),
        folder: typeof folder === "string" && folder ? folder : undefined,
        tag: typeof tag === "string" && tag ? tag : undefined,
        sort: parseSort(sort),
        order: parseOrder(order),
        noteType: typeof note_type === "string" ? note_type : undefined,
        title: typeof title === "string" && title ? title : undefined,
      });
      res.json(result);
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { title, content, path, noteType, meetingLocation, meetingStart, meetingEnd } = req.body;

      if (!title && !content) {
        throw new BadRequest("title or content is required");
      }

      if (path !== undefined && (typeof path !== "string" || !path.startsWith("/"))) {
        throw new BadRequest("path must be a string starting with /");
      }

      if (noteType && !["note", "meeting"].includes(noteType)) {
        throw new BadRequest("noteType must be 'note' or 'meeting'");
      }

      const payload: NoteCreatePayload = { title, content, path };
      if (noteType) payload.noteType = noteType;
      if (meetingLocation !== undefined) payload.meetingLocation = meetingLocation || undefined;
      if (meetingStart !== undefined) payload.meetingStart = meetingStart || undefined;
      if (meetingEnd !== undefined) payload.meetingEnd = meetingEnd || undefined;

      const note = noteRepo.create(payload);
      syncNoteRelations(note.id, content ?? "", noteRepo, tagRepo, linkRepo, peopleRepo);

      if (noteType === "meeting" && tagRepo) {
        const meetingTag = tagRepo.upsert("meeting");
        tagRepo.addToNote(note.id, meetingTag.id, "manual");
      }

      const full = enrichNote(note.id, noteRepo, tagRepo, linkRepo, peopleRepo);
      res.status(201).json(full);
    }),
  );

  router.get(
    "/daily/streak",
    asyncHandler(async (_req, res) => {
      res.json({ streak: noteRepo.getDailyStreak() });
    }),
  );

  router.get(
    "/daily",
    asyncHandler(async (req, res) => {
      const limit = clampLimit(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const result = noteRepo.getDailyNotes(limit, offset);
      res.json(result);
    }),
  );

  router.get(
    "/by-title/:title",
    asyncHandler(async (req, res) => {
      const title = req.params.title as string;
      const note = noteRepo.getByTitle(title);
      if (!note) throw new NotFound("Note not found");
      res.json(note);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const tags = tagRepo.getTagsForNote(id);
      const backlinks = linkRepo.getBacklinks(id);
      const outgoingLinks = linkRepo.getOutgoingLinks(id);
      const people = peopleRepo ? peopleRepo.getNotePeople(id) : [];
      const icsOutOfDate = note.icsUid ? checkIcsOutOfDate(note, peopleRepo) : false;

      res.json({ ...note, tags, backlinks, outgoingLinks, people, icsOutOfDate });
    }),
  );

  router.get(
    "/:id/backlinks",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const limit = clampLimit(req.query.limit, BACKLINK_DEFAULT_LIMIT, MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const result = linkRepo.getBacklinkNotes(id, limit, offset);

      res.json(result);
    }),
  );

  router.get(
    "/:id/unlinked-mentions",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      if (!note.title.trim()) {
        res.json({ items: [], total: 0, hasMore: false });
        return;
      }

      const backlinkIds = new Set(linkRepo.getBacklinks(id));
      const title = note.title.trim();
      const titleLower = title.toLowerCase();
      const candidates = noteRepo.findByContentContaining(title);

      const unlinked = candidates.filter((c) => {
        if (c.id === id) return false;
        if (backlinkIds.has(c.id)) return false;
        return c.content.toLowerCase().includes(titleLower);
      });

      const limit = clampLimit(req.query.limit, 10, MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const total = unlinked.length;
      const items = unlinked.slice(offset, offset + limit);

      res.json({ items, total, hasMore: offset + limit < total });
    }),
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const existing = noteRepo.getById(id);
      if (!existing) throw new NotFound("Note not found");

      const { title, content, path, meetingLocation, meetingStart, meetingEnd } = req.body;

      if (title !== undefined && title !== existing.title && noteRepo.titleExists(title, id)) {
        throw new Conflict(`A note with the title "${title}" already exists`);
      }

      if (path !== undefined && (typeof path !== "string" || !path.startsWith("/"))) {
        throw new BadRequest("path must be a string starting with /");
      }

      // Snapshot current state before updating
      if (versionRepo) {
        versionRepo.create(id, existing.title, existing.content);
      }

      const note = noteRepo.update(id, { title, content, path });
      if (!note) throw new NotFound("Note not found");

      // Apply meeting field updates
      if (meetingLocation !== undefined || meetingStart !== undefined || meetingEnd !== undefined) {
        noteRepo.updateMeetingFields(id, { meetingLocation, meetingStart, meetingEnd });
      }

      syncNoteRelations(note.id, note.content, noteRepo, tagRepo, linkRepo, peopleRepo);

      const full = enrichNote(note.id, noteRepo, tagRepo, linkRepo, peopleRepo);
      res.json(full);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const existing = noteRepo.getById(id);
      if (!existing) throw new NotFound("Note not found");

      noteRepo.delete(id);
      res.status(204).end();
    }),
  );

  router.post(
    "/:id/tags",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const { name } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        throw new BadRequest("Tag name is required");
      }

      const tag = tagRepo.upsert(name.trim());
      tagRepo.addToNote(note.id, tag.id, "manual");

      const full = enrichNote(id, noteRepo, tagRepo, linkRepo);
      res.json(full);
    }),
  );

  router.delete(
    "/:id/tags/:tagName",
    asyncHandler(async (req, res) => {
      const id = req.params.id as string;
      const note = noteRepo.getById(id);
      if (!note) throw new NotFound("Note not found");

      const tag = tagRepo.getByName(req.params.tagName as string);
      if (!tag) throw new NotFound("Tag not found");

      tagRepo.removeFromNote(note.id, tag.id);
      tagRepo.deleteUnused();

      const full = enrichNote(id, noteRepo, tagRepo, linkRepo);
      res.json(full);
    }),
  );

  router.post(
    "/from-event",
    asyncHandler(async (req, res) => {
      const {
        title, date, start, end, location,
        organizer, attendees,
      } = req.body;

      if (!title || !date) {
        throw new BadRequest("title and date are required");
      }

      if (!peopleRepo) {
        throw new BadRequest("People repository not available");
      }

      // Check for duplicate by ICS UID (if provided)
      const icsUid: string | undefined = req.body.icsUid;
      if (icsUid) {
        const existingNote = noteRepo.getByIcsUid(icsUid);
        if (existingNote) {
          const full = enrichNote(existingNote.id, noteRepo, tagRepo, linkRepo, peopleRepo);
          res.json(full);
          return;
        }
      }

      const meetingContent = `# ${title}

## Agenda

1.

## Action Items

- [ ]

## Notes
`;

      const now = new Date().toISOString();
      const note = noteRepo.create({
        title: `Meeting: ${title}`,
        content: meetingContent,
        path: "/Meetings",
        noteType: "meeting",
        meetingLocation: location || undefined,
        meetingStart: start ? new Date(start).toISOString() : undefined,
        meetingEnd: end ? new Date(end).toISOString() : undefined,
        icsUid: icsUid || undefined,
        icsLastSynced: icsUid ? now : undefined,
      });

      // Auto-link meeting tag
      const meetingTag = tagRepo.upsert("meeting");
      tagRepo.addToNote(note.id, meetingTag.id, "manual");

      // Link organizer
      if (organizer) {
        const orgPerson = peopleRepo.upsert(organizer.name, organizer.email);
        peopleRepo.linkToNote(note.id, orgPerson.id, "organizer");
      }

      // Link attendees with status
      if (attendees && Array.isArray(attendees)) {
        for (const att of attendees) {
          const attPerson = peopleRepo.upsert(att.name, att.email);
          peopleRepo.linkToNote(note.id, attPerson.id, "attendee", att.status ?? null);
        }
      }

      const full = enrichNote(note.id, noteRepo, tagRepo, linkRepo, peopleRepo);
      res.status(201).json(full);
    }),
  );

  // Sync meeting note from ICS
  router.post(
    "/:id/sync-from-ics",
    asyncHandler(async (req, res) => {
      const note = noteRepo.getById(req.params.id as string);
      if (!note) throw new NotFound("Note not found");
      if (note.noteType !== "meeting") {
        throw new BadRequest("Only meeting notes can be synced from ICS");
      }
      if (!note.icsUid) {
        throw new BadRequest("Note is not linked to an ICS event");
      }
      if (!peopleRepo) {
        throw new BadRequest("People repository not available");
      }

      const {
        title, start, end, location,
        organizer, attendees,
      } = req.body;

      const now = new Date().toISOString();

      // Update meeting metadata
      if (start || end || location) {
        noteRepo.updateMeetingFields(note.id, {
          meetingLocation: location !== undefined ? location : undefined,
          meetingStart: start ? new Date(start).toISOString() : undefined,
          meetingEnd: end ? new Date(end).toISOString() : undefined,
          icsLastSynced: now,
        });
      } else {
        noteRepo.updateMeetingFields(note.id, { icsLastSynced: now });
      }

      // Update title if changed
      if (title && title !== note.title) {
        noteRepo.update(note.id, { title: `Meeting: ${title}` });
      }

      // Update organizer
      if (organizer) {
        peopleRepo.clearRoleFromNote(note.id, "organizer");
        const orgPerson = peopleRepo.upsert(organizer.name, organizer.email);
        peopleRepo.linkToNote(note.id, orgPerson.id, "organizer");
      }

      // Update attendees — upsert with new statuses, keep existing removed ones
      if (attendees && Array.isArray(attendees)) {
        for (const att of attendees) {
          const attPerson = peopleRepo.upsert(att.name, att.email);
          peopleRepo.linkToNote(note.id, attPerson.id, "attendee", att.status ?? null);
        }
      }

      const full = enrichNote(note.id, noteRepo, tagRepo, linkRepo, peopleRepo);
      res.json(full);
    }),
  );

  // Link people to note
  router.post(
    "/:id/people",
    asyncHandler(async (req, res) => {
      const noteId = req.params.id as string;
      const note = noteRepo.getById(noteId);
      if (!note) throw new NotFound("Note not found");
      if (!peopleRepo) throw new BadRequest("People repository not available");

      const { personIds, role, status } = req.body;
      if (!Array.isArray(personIds) || personIds.length === 0) {
        throw new BadRequest("personIds array is required");
      }
      if (!role || !["organizer", "attendee", "mentioned"].includes(role)) {
        throw new BadRequest("role must be 'organizer', 'attendee', or 'mentioned'");
      }

      for (const personId of personIds) {
        peopleRepo.linkToNote(noteId, personId, role, status ?? null);
      }

      const full = enrichNote(noteId, noteRepo, tagRepo, linkRepo, peopleRepo);
      res.json(full);
    }),
  );

  // Unlink person from note
  router.delete(
    "/:id/people/:personId",
    asyncHandler(async (req, res) => {
      const noteId = req.params.id as string;
      const personId = req.params.personId as string;
      const role = typeof req.query.role === "string" ? req.query.role : null;

      if (!peopleRepo) throw new BadRequest("People repository not available");

      if (role) {
        peopleRepo.unlinkFromNote(noteId, personId, role);
      } else {
        // Remove all roles for this person on this note
        for (const r of ["organizer", "attendee", "mentioned"]) {
          peopleRepo.unlinkFromNote(noteId, personId, r);
        }
      }

      const full = enrichNote(noteId, noteRepo, tagRepo, linkRepo, peopleRepo);
      res.json(full);
    }),
  );

  return router;
}

function syncNoteRelations(
  noteId: string,
  content: string,
  noteRepo: NoteRepository,
  tagRepo: TagRepository,
  linkRepo: LinkRepository,
  peopleRepo?: PeopleRepository,
): void {
  const { wikilinks, tags, mentions } = parseContent(content);

  const currentTags = tagRepo.getTagsForNoteBySource(noteId, "content");
  const currentTagIds = currentTags.map((t) => t.id);

  const newTagIds: string[] = [];
  for (const tagMatch of tags) {
    const t = tagRepo.upsert(tagMatch.name);
    newTagIds.push(t.id);
    if (!currentTagIds.includes(t.id)) {
      tagRepo.addToNote(noteId, t.id, "content");
    }
  }

  for (const tagId of currentTagIds) {
    if (!newTagIds.includes(tagId)) {
      tagRepo.removeFromNote(noteId, tagId);
    }
  }

  const targetIds: string[] = [];
  for (const wl of wikilinks) {
    const target = noteRepo.getByTitle(wl.target);
    if (target) {
      targetIds.push(target.id);
    }
  }
  linkRepo.setLinks(noteId, targetIds);

  if (peopleRepo) {
    const currentPeople = peopleRepo.getNotePeopleByRole(noteId, "mentioned");
    const currentPersonIds = currentPeople.map((p) => p.personId);

    const newPersonIds: string[] = [];
    for (const m of mentions) {
      if (m.personId) {
        newPersonIds.push(m.personId);
        if (!currentPersonIds.includes(m.personId)) {
          peopleRepo.linkToNote(noteId, m.personId, "mentioned");
        }
      }
    }

    for (const personId of currentPersonIds) {
      if (!newPersonIds.includes(personId)) {
        peopleRepo.unlinkFromNote(noteId, personId, "mentioned");
      }
    }
  }

  tagRepo.deleteUnused();
}

function enrichNote(
  noteId: string,
  noteRepo: NoteRepository,
  tagRepo: TagRepository,
  linkRepo: LinkRepository,
  peopleRepo?: PeopleRepository,
): Record<string, unknown> {
  const note = noteRepo.getById(noteId);
  if (!note) return {};

  const tags = tagRepo.getTagsForNote(noteId);
  const backlinks = linkRepo.getBacklinks(note.id);
  const outgoingLinks = linkRepo.getOutgoingLinks(note.id);
  const people = peopleRepo ? peopleRepo.getNotePeople(note.id) : [];
  const icsOutOfDate = note.icsUid ? checkIcsOutOfDate(note, peopleRepo) : false;

  return { ...note, tags, backlinks, outgoingLinks, people, icsOutOfDate };
}

function checkIcsOutOfDate(
  _note: { icsUid: string | null; icsLastSynced: string | null },
  _peopleRepo?: PeopleRepository,
): boolean {
  // This is a placeholder — actual stale detection happens in the outlook
  // sync flow when the ICS feed is re-fetched. The flag is primarily set
  // by the /api/calendar/outlook/stale endpoint and synced via
  // sync-from-ics. For now, we return false — the client can rely on the
  // stale endpoint for accurate data.
  return false;
}
