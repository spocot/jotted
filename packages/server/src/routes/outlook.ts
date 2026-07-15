import { Router } from "express";
import type { NoteRepository } from "../db/note-repository.js";
import type { PeopleRepository } from "../db/people-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest } from "../lib/errors.js";
import {
  fetchEvents,
  configureIcsUrl,
  clearConfig,
  getStatus,
} from "../services/outlook.js";

export function createOutlookRouter(
  noteRepo?: NoteRepository,
  peopleRepo?: PeopleRepository,
): Router {
  const router = Router();

  // GET /api/calendar/outlook — fetch events within a date range
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const startDate = req.query.start as string | undefined;
      const endDate = req.query.end as string | undefined;
      if (!startDate || !endDate) {
        throw new BadRequest("start and end query params are required");
      }

      const result = await fetchEvents(startDate, endDate);
      res.json(result);
    }),
  );

  // GET /api/calendar/outlook/status — current connection status
  router.get(
    "/status",
    asyncHandler(async (_req, res) => {
      const status = await getStatus();
      res.json(status);
    }),
  );

  // POST /api/calendar/outlook/config — set ICS URL
  router.post(
    "/config",
    asyncHandler(async (req, res) => {
      const { icsUrl } = req.body ?? {};
      if (!icsUrl) {
        throw new BadRequest("Provide icsUrl");
      }
      await configureIcsUrl(icsUrl);
      res.json({ message: "ICS URL configured" });
    }),
  );

  // DELETE /api/calendar/outlook/config — clear ICS URL
  router.delete(
    "/config",
    asyncHandler(async (_req, res) => {
      await clearConfig();
      res.json({ message: "Calendar config cleared" });
    }),
  );

  // GET /api/calendar/outlook/stale — detect out-of-sync meeting notes
  router.get(
    "/stale",
    asyncHandler(async (req, res) => {
      const startDate = req.query.start as string | undefined;
      const endDate = req.query.end as string | undefined;
      if (!startDate || !endDate) {
        throw new BadRequest("start and end query params are required");
      }

      if (!noteRepo || !peopleRepo) {
        res.json({ stale: [] });
        return;
      }

      // Fetch current ICS events
      const icsResult = await fetchEvents(startDate, endDate);
      const icsEvents = icsResult.events;

      // Find notes linked to these ICS events
      const staleNotes: Array<{
        icsUid: string;
        noteId: string;
        changes: string[];
      }> = [];

      for (const event of icsEvents) {
        const note = noteRepo.getByIcsUid(event.id);
        if (!note) continue;

        const changes: string[] = [];

        // Compare meeting start
        const evStart = new Date(event.start).toISOString();
        if (note.meetingStart && note.meetingStart !== evStart) {
          changes.push("time changed");
        }

        // Compare location
        if (event.location && note.meetingLocation !== event.location) {
          changes.push("location changed");
        }

        // Compare attendees
        if (event.attendees && event.attendees.length > 0) {
          const currentPeople = peopleRepo.getNotePeopleByRole(note.id, "attendee");
          const currentEmails = new Set(currentPeople.map((p) => p.email).filter(Boolean));

          const newEmails = new Set<string>();
          const statusChanges: string[] = [];

          for (const att of event.attendees) {
            if (att.email) newEmails.add(att.email);

            const match = currentPeople.find(
              (p) => p.email === att.email || p.name === att.name,
            );
            if (match && match.status !== att.status) {
              statusChanges.push(att.status);
            }
          }

          if (currentPeople.length !== event.attendees.length) {
            changes.push("attendee list changed");
          }
          if (statusChanges.length > 0) {
            changes.push("attendee statuses changed");
          }
        }

        // Compare organizer
        if (event.organizer) {
          const orgPeople = peopleRepo.getNotePeopleByRole(note.id, "organizer");
          if (orgPeople.length === 0) {
            changes.push("organizer changed");
          } else {
            const orgEmail = orgPeople[0].email;
            if (event.organizer.email && orgEmail !== event.organizer.email) {
              changes.push("organizer changed");
            }
          }
        }

        if (changes.length > 0) {
          staleNotes.push({
            icsUid: event.id,
            noteId: note.id,
            changes,
          });
        }
      }

      res.json({ stale: staleNotes });
    }),
  );

  return router;
}
