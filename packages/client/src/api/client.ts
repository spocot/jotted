import type {
  Note,
  NoteCreatePayload,
  NoteUpdatePayload,
  EnrichedNote,
  Tag,
  GraphData,
  SearchSuggestion,
} from "../types";

const BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  getNotes(folder?: string, tag?: string): Promise<Note[]> {
    const params = new URLSearchParams();
    if (folder) params.set("folder", folder);
    if (tag) params.set("tag", tag);
    const qs = params.toString();
    return request(`/notes${qs ? `?${qs}` : ""}`);
  },

  createNote(payload: NoteCreatePayload): Promise<EnrichedNote> {
    return request("/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getNote(id: string): Promise<EnrichedNote> {
    return request(`/notes/${id}`);
  },

  updateNote(id: string, payload: NoteUpdatePayload): Promise<EnrichedNote> {
    return request(`/notes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteNote(id: string): Promise<void> {
    return request(`/notes/${id}`, { method: "DELETE" });
  },

  getNoteBacklinks(id: string): Promise<Note[]> {
    return request(`/notes/${id}/backlinks`);
  },

  searchNotes(q: string): Promise<Note[]> {
    return request(`/search?q=${encodeURIComponent(q)}`);
  },

  searchSuggest(q: string): Promise<SearchSuggestion[]> {
    return request(`/search/suggest?q=${encodeURIComponent(q)}`);
  },

  getTags(): Promise<Tag[]> {
    return request("/tags");
  },

  getTagNotes(name: string): Promise<Note[]> {
    return request(`/tags/${encodeURIComponent(name)}/notes`);
  },

  getGraph(): Promise<GraphData> {
    return request("/graph");
  },

  getGraphSub(id: string): Promise<GraphData> {
    return request(`/graph/${id}`);
  },
};
