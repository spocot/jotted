import { Router } from "express";
import type { PeopleRepository } from "../db/people-repository.js";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest, NotFound } from "../lib/errors.js";
import {
  clampLimit,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from "../lib/pagination.js";

export function createPeopleRouter(
  peopleRepo: PeopleRepository,
): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (q) {
        res.json(peopleRepo.search(q));
      } else {
        res.json(peopleRepo.list());
      }
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { name, email } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        throw new BadRequest("name is required");
      }
      const person = peopleRepo.create({ name: name.trim(), email });
      res.status(201).json(person);
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const person = peopleRepo.getById(req.params.id as string);
      if (!person) throw new NotFound("Person not found");
      const roleCounts = peopleRepo.getRoleCounts(person.id);
      res.json({ ...person, roleCounts });
    }),
  );

  router.put(
    "/:id",
    asyncHandler(async (req, res) => {
      const { name, email } = req.body;
      const updated = peopleRepo.update(req.params.id as string, { name, email });
      if (!updated) throw new NotFound("Person not found");
      res.json(updated);
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const deleted = peopleRepo.delete(req.params.id as string);
      if (!deleted) throw new NotFound("Person not found");
      res.status(204).end();
    }),
  );

  router.get(
    "/:id/notes",
    asyncHandler(async (req, res) => {
      const personId = req.params.id as string;
      const person = peopleRepo.getById(personId);
      if (!person) throw new NotFound("Person not found");

      const limit = clampLimit(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const offset = Math.max(0, Number(req.query.offset) || 0);
      const role = typeof req.query.role === "string" ? req.query.role.trim() : undefined;
      const status = typeof req.query.status === "string" ? req.query.status.trim() : undefined;

      const result = peopleRepo.getPersonNotes(personId, role, status, limit, offset);
      res.json(result);
    }),
  );

  return router;
}
