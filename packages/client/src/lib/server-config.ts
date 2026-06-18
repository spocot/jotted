const STORAGE_KEY = "jotted-server-url";
const DEFAULT_URL = "http://localhost:3000";

export function getServerUrl(): string {
  if (typeof localStorage === "undefined") return DEFAULT_URL;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_URL;
}

export function setServerUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ""));
}

export function getApiBaseUrl(): string {
  return `${getServerUrl()}/api`;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${getServerUrl()}${path}`;
}
