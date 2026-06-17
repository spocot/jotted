import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

export const SIDEBAR_MIN = 200;
export const SIDEBAR_MAX = 500;
export const SIDEBAR_DEFAULT = 256;

export interface UiState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  darkMode: boolean;
}

const initialState: UiState = {
  sidebarOpen: true,
  sidebarWidth: SIDEBAR_DEFAULT,
  darkMode: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setSidebarWidth(state, action: PayloadAction<number>) {
      state.sidebarWidth = Math.max(
        SIDEBAR_MIN,
        Math.min(SIDEBAR_MAX, action.payload),
      );
    },
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
    },
  },
});

export const { toggleSidebar, setSidebarOpen, setSidebarWidth, toggleDarkMode } =
  uiSlice.actions;

export const selectSidebarOpen = (s: RootState) => s.ui.sidebarOpen;
export const selectSidebarWidth = (s: RootState) => s.ui.sidebarWidth;
export const selectDarkMode = (s: RootState) => s.ui.darkMode;

export default uiSlice.reducer;
