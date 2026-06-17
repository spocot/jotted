import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "./store";

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = {
  toasts: [],
};

const toastSlice = createSlice({
  name: "toast",
  initialState,
  reducers: {
    addToastAction(state, action: PayloadAction<Toast>) {
      state.toasts.push(action.payload);
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts(state) {
      state.toasts = [];
    },
  },
});

export const { addToastAction, removeToast, clearToasts } = toastSlice.actions;

export const selectToasts = (s: RootState) => s.toast.toasts;

let toastCounter = 0;

export const addToast =
  (message: string, type: Toast["type"] = "info") =>
  (dispatch: (action: unknown) => void) => {
    const id = `toast-${++toastCounter}`;
    dispatch(addToastAction({ id, message, type }));
    setTimeout(() => {
      dispatch(removeToast(id));
    }, 4000);
  };

export default toastSlice.reducer;
