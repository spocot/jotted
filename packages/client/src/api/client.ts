import type {
  Note,
  NoteCreatePayload,
  NoteUpdatePayload,
  EnrichedNote,
  Tag,
  GraphData,
  SearchSuggestion,
  SearchOptions,
  FolderNode,
  Upload,
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

  getBacklinkCounts(): Promise<Record<string, number>> {
    return request("/notes/backlink-counts");
  },

  getNoteBacklinks(id: string): Promise<Note[]> {
    return request(`/notes/${id}/backlinks`);
  },

  getNoteUnlinkedMentions(id: string): Promise<Note[]> {
    return request(`/notes/${id}/unlinked-mentions`);
  },

  getNoteByTitle(title: string): Promise<Note> {
    return request(`/notes/by-title/${encodeURIComponent(title)}`);
  },

  searchNotes(q: string, options?: SearchOptions): Promise<Note[]> {
    const params = new URLSearchParams({ q });
    if (options?.tag) params.set("tag", options.tag);
    if (options?.sort) params.set("sort", options.sort);
    if (options?.order) params.set("order", options.order);
    return request(`/search?${params.toString()}`);
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

  renameTag(oldName: string, newName: string): Promise<Tag> {
    return request(`/tags/${encodeURIComponent(oldName)}`, {
      method: "PUT",
      body: JSON.stringify({ name: newName }),
    });
  },

  deleteTag(name: string): Promise<void> {
    return request(`/tags/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  },

  addNoteTag(noteId: string, name: string): Promise<EnrichedNote> {
    return request(`/notes/${noteId}/tags`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  removeNoteTag(noteId: string, tagName: string): Promise<EnrichedNote> {
    return request(`/notes/${noteId}/tags/${encodeURIComponent(tagName)}`, {
      method: "DELETE",
    });
  },

  getGraph(): Promise<GraphData> {
    return request("/graph");
  },

  getGraphSub(id: string): Promise<GraphData> {
    return request(`/graph/${id}`);
  },

  getFolders(): Promise<FolderNode[]> {
    return request("/folders");
  },

  renameFolder(oldPath: string, newPath: string): Promise<{ moved: number }> {
    return request("/folders/rename", {
      method: "PUT",
      body: JSON.stringify({ oldPath, newPath }),
    });
  },

  deleteFolder(path: string): Promise<{ moved: number }> {
    return request(`/folders?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
  },

  async uploadFile(noteId: string, file: File): Promise<Upload> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("noteId", noteId);
    const res = await fetch(`${BASE}/uploads`, {
      method: "POST",
      body: formData,
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error ?? "Upload failed");
    }
    return body as Upload;
  },

  getUploads(noteId: string): Promise<Upload[]> {
    return request(`/uploads/${noteId}`);
  },

  deleteUpload(id: string): Promise<void> {
    return request(`/uploads/${id}`, { method: "DELETE" });
  },
};
