import { Router } from "express";
import { asyncHandler } from "../lib/async-handler.js";
import { BadRequest } from "../lib/errors.js";
import {
  fetchEvents,
  configureIcsUrl,
  clearConfig,
  getStatus,
} from "../services/outlook.js";

export function createOutlookRouter(): Router {
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

  return router;
}
