import { create } from "zustand";
import type { Tag } from "../types";
import { api } from "../api/client";

interface TagState {
  tags: Tag[];
  loading: boolean;
  error: string | null;
  fetchTags: () => Promise<void>;
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
}));
