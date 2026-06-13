import { create } from "zustand";
import type { Note, NoteCreatePayload, NoteUpdatePayload, EnrichedNote } from "../types";
import { api } from "../api/client";

let selectVersion = 0;

interface NotesState {
  notes: Note[];
  selectedNote: EnrichedNote | null;
  loading: boolean;
  error: string | null;
  fetchNotes: (folder?: string, tag?: string) => Promise<void>;
  selectNote: (id: string | null) => Promise<void>;
  createNote: (payload?: NoteCreatePayload) => Promise<EnrichedNote>;
  updateNote: (id: string, payload: NoteUpdatePayload) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useNoteStore = create<NotesState>((set, get) => ({
  notes: [],
  selectedNote: null,
  loading: false,
  error: null,

  fetchNotes: async (folder?: string, tag?: string) => {
    set({ loading: true, error: null });
    try {
      const notes = await api.getNotes(folder, tag);
      set({ notes });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  selectNote: async (id: string | null) => {
    selectVersion += 1;
    const version = selectVersion;
    if (!id) {
      set({ selectedNote: null });
      return;
    }
    set({ selectedNote: null, loading: true, error: null });
    try {
      const selectedNote = await api.getNote(id);
      if (version !== selectVersion) return;
      set({ selectedNote });
    } catch (err) {
      if (version === selectVersion) {
        set({ error: (err as Error).message });
      }
    } finally {
      if (version === selectVersion) {
        set({ loading: false });
      }
    }
  },

  createNote: async (payload?: NoteCreatePayload) => {
    set({ loading: true, error: null });
    try {
      const note = await api.createNote(payload ?? { title: "Untitled" });
      const { notes } = get();
      set({ notes: [note, ...notes] });
      return note;
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  updateNote: async (id: string, payload: NoteUpdatePayload) => {
    const version = selectVersion;
    set({ error: null });
    try {
      const enriched = await api.updateNote(id, payload);
      if (version !== selectVersion) return;
      const { notes, selectedNote } = get();
      set({
        notes: notes.map((n) => (n.id === id ? enriched : n)),
        selectedNote: selectedNote?.id === id ? enriched : selectedNote,
      });
    } catch (err) {
      if (version === selectVersion) {
        set({ error: (err as Error).message });
      }
    }
  },

  deleteNote: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.deleteNote(id);
      const { notes, selectedNote } = get();
      set({
        notes: notes.filter((n) => n.id !== id),
        selectedNote: selectedNote?.id === id ? null : selectedNote,
      });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
