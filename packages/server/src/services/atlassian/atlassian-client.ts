import { loadConfig, isUnlocked } from "./atlassian-config.js";

export class AtlassianAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlassianAuthError";
  }
}

export class AtlassianNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AtlassianNotFoundError";
  }
}

interface AtlassianClientOptions {
  method?: string;
  body?: unknown;
}

async function fetchAtlassian(
  path: string,
  options: AtlassianClientOptions = {},
): Promise<unknown> {
  const config = await loadConfig();
  if (!config) {
    throw new AtlassianAuthError("Atlassian integration not configured. Set domain, email, and API token in Settings.");
  }

  if (!isUnlocked()) {
    throw new AtlassianAuthError("Atlassian config is locked. Enter your master password in Settings > Integrations.");
  }

  const baseUrl = `https://${config.domain}/rest/api/3`;
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");

  const headers: Record<string, string> = {
    "Authorization": `Basic ${auth}`,
    "Accept": "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    throw new AtlassianAuthError(
      `Atlassian authentication failed (${res.status}). Check your email and API token.`,
    );
  }

  if (res.status === 404) {
    throw new AtlassianNotFoundError(`Resource not found: ${path}`);
  }

  if (!res.ok) {
    let errorMessage = `Atlassian API error (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body === "object") {
        const msgs = (body as { errorMessages?: string[] }).errorMessages;
        if (msgs && msgs.length) {
          errorMessage = msgs.join("; ");
        }
      }
    } catch {
      // ignore parse error
    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function fetchJiraApi(
  path: string,
  options?: AtlassianClientOptions,
): Promise<unknown> {
  return fetchAtlassian(path, options);
}

export async function fetchConfluenceApi(
  path: string,
  options?: AtlassianClientOptions,
): Promise<unknown> {
  const config = await loadConfig();
  if (!config) {
    throw new AtlassianAuthError("Atlassian integration not configured.");
  }
  if (!isUnlocked()) {
    throw new AtlassianAuthError("Atlassian config is locked.");
  }

  const baseUrl = `https://${config.domain}/wiki/api/v2`;
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString("base64");

  const headers: Record<string, string> = {
    "Authorization": `Basic ${auth}`,
    "Accept": "application/json",
  };

  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options?.method ?? "GET",
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401 || res.status === 403) {
    throw new AtlassianAuthError(`Atlassian authentication failed (${res.status}).`);
  }

  if (res.status === 404) {
    throw new AtlassianNotFoundError(`Resource not found: ${path}`);
  }

  if (!res.ok) {
    let errorMessage = `Confluence API error (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body === "object") {
        const msg = (body as { message?: string }).message;
        if (msg) errorMessage = msg;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
  }

  if (res.status === 204) return null;
  return res.json();
}
