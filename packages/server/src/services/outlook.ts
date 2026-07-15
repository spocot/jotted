import { writeFile, readFile, access, constants } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ical from "node-ical";
import type { VEvent } from "node-ical";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_PATH = join(__dirname, "../../data/outlook-config.json");

export interface OutlookAttendee {
  name: string;
  email?: string;
  status: string;
}

export interface OutlookEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location: string;
  isAllDay: boolean;
  organizer?: { name: string; email?: string };
  attendees?: OutlookAttendee[];
}

export type OutlookMethod = "ics" | "none";

interface OutlookConfig {
  method: OutlookMethod;
  icsUrl?: string;
}

function defaultConfig(): OutlookConfig {
  return { method: "none" };
}

let configCache: OutlookConfig | null = null;

async function loadConfig(): Promise<OutlookConfig> {
  if (configCache) return configCache;
  try {
    await access(CONFIG_PATH, constants.R_OK);
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    configCache = { ...defaultConfig(), ...parsed };
    return configCache as OutlookConfig;
  } catch {
    configCache = defaultConfig();
    return configCache;
  }
}

async function saveConfig(config: OutlookConfig): Promise<void> {
  configCache = config;
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

// ─── ICS URL Fetching ─────────────────────────────────────────────────

function icalValue(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object") {
    const obj = val as { val?: string };
    return obj.val ?? "";
  }
  return "";
}

async function fetchIcsFromUrl(
  url: string,
  startDate: string,
  endDate: string,
): Promise<OutlookEvent[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ICS: ${res.status} ${res.statusText}`);
  }

  const raw = await res.text();
  const parsed = ical.sync.parseICS(raw);
  const events: OutlookEvent[] = [];

  for (const key of Object.keys(parsed)) {
    const item = parsed[key];
    if (!item || item.type !== "VEVENT") continue;

    const event = item as VEvent;
    if (!event.start || !event.end) continue;

    const startDateObj = event.start;
    const endDateObj = event.end;

    const organizer = event.organizer
      ? {
          name: icalValue((event.organizer as { params?: { CN?: string } })?.params?.CN || icalValue(event.organizer)) || icalValue(event.organizer),
          email: icalValue(event.organizer).replace(/^mailto:/i, ""),
        }
      : undefined;

    const attendees: OutlookAttendee[] = [];
    if (event.attendee) {
      const attList = Array.isArray(event.attendee) ? event.attendee : [event.attendee];
      for (const att of attList) {
        const attObj = att as { params?: { CN?: string; PARTSTAT?: string }; val?: string };
        attendees.push({
          name: attObj?.params?.CN || icalValue(att).replace(/^mailto:/i, ""),
          email: icalValue(att).replace(/^mailto:/i, ""),
          status: attObj?.params?.PARTSTAT?.toLowerCase() || "needs-action",
        });
      }
    }

    events.push({
      id: event.uid ?? key,
      title: icalValue(event.summary) || "(no subject)",
      start: startDateObj instanceof Date ? startDateObj.toISOString() : String(startDateObj),
      end: endDateObj instanceof Date ? endDateObj.toISOString() : String(endDateObj),
      location: icalValue(event.location),
      isAllDay: startDateObj instanceof Date
        ? startDateObj.getHours() === 0 && startDateObj.getMinutes() === 0
        : false,
      organizer: organizer?.name ? organizer : undefined,
      attendees: attendees.length > 0 ? attendees : undefined,
    });
  }

  const rangeStart = new Date(`${startDate}T00:00:00`).getTime();
  const rangeEnd = new Date(`${endDate}T23:59:59`).getTime();

  return events.filter((ev) => {
    const evStart = new Date(ev.start).getTime();
    const evEnd = new Date(ev.end).getTime();
    return evEnd >= rangeStart && evStart <= rangeEnd;
  });
}

// ─── Public API ──────────────────────────────────────────────────────

export interface OutlookFetchResult {
  events: OutlookEvent[];
  method: OutlookMethod;
  available: boolean;
  message?: string;
  needsConfig?: boolean;
}

export async function fetchEvents(
  startDate: string,
  endDate: string,
): Promise<OutlookFetchResult> {
  const config = await loadConfig();

  if (!config.icsUrl) {
    return {
      events: [],
      method: "none",
      available: false,
      message: "Configure an Outlook Web shared calendar ICS link.",
      needsConfig: true,
    };
  }

  try {
    const events = await fetchIcsFromUrl(config.icsUrl, startDate, endDate);
    return {
      events,
      method: "ics",
      available: true,
      message: "Connected via Outlook Web ICS link",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      events: [],
      method: "none",
      available: false,
      message: `Failed to fetch ICS: ${msg}`,
      needsConfig: true,
    };
  }
}

export async function configureIcsUrl(url: string): Promise<void> {
  const config = await loadConfig();
  config.method = "ics";
  config.icsUrl = url;
  await saveConfig(config);
}

export async function clearConfig(): Promise<void> {
  const config = await loadConfig();
  config.icsUrl = undefined;
  config.method = "none";
  await saveConfig(config);
}

export async function getStatus(): Promise<{
  method: OutlookMethod;
  hasIcsUrl: boolean;
  icsUrl?: string;
}> {
  const config = await loadConfig();
  return {
    method: config.method,
    hasIcsUrl: !!config.icsUrl,
    icsUrl: config.icsUrl,
  };
}
