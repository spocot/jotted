import { create } from "zustand";
import type { Tag } from "../types";
import { api } from "../api/client";

interface TagState {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  fetchTags: () => Promise<void>;
  renameTag: (oldName: string, newName: string) => Promise<void>;
  deleteTag: (name: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  loading: false,
  error: null,

  fetchTags: async () => {
    set({ loading: true, error: null });
    try {
      const tags = await api.getTags();
      set({ tags });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  renameTag: async (oldName: string, newName: string) => {
    set({ error: null });
    try {
      await api.renameTag(oldName, newName);
      const tags = await api.getTags();
      set({ tags });
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },

  deleteTag: async (name: string) => {
    set({ error: null });
    try {
      await api.deleteTag(name);
      set((s) => ({ tags: s.tags.filter((t) => t.name !== name) }));
    } catch (err) {
      set({ error: (err as Error).message });
      throw err;
    }
  },
}));
