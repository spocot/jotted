import { useState, useEffect } from "react";
import Modal from "./Modal";
import type { SmartFolder, SavedSearchQuery } from "../types";
import {
  useCreateSmartFolderMutation,
  useUpdateSmartFolderMutation,
} from "../store/redux/api";
import { useAppDispatch } from "../store/redux/hooks";
import { addToast } from "../store/redux/toastSlice";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  editing?: SmartFolder | null;
}

export default function SmartFolderEditorModal({ open, onClose, editing }: Props) {
  const [name, setName] = useState("");
  const [queryText, setQueryText] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const [createSmartFolder] = useCreateSmartFolderMutation();
  const [updateSmartFolder] = useUpdateSmartFolderMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      const raw = editing.queryJson as unknown;
      const q: SavedSearchQuery = typeof raw === "string" ? JSON.parse(raw) : (raw as SavedSearchQuery);
      setQueryText(q.q ?? "");
      setTagFilter(q.tag ?? "");
    } else {
      setName("");
      setQueryText("");
      setTagFilter("");
    }
  }, [editing, open]);

  const queryJson: SavedSearchQuery = {};
  if (queryText.trim()) queryJson.q = queryText.trim();
  if (tagFilter.trim()) queryJson.tag = tagFilter.trim();

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      if (editing) {
        await updateSmartFolder({
          id: editing.id,
          name: trimmed,
          queryJson: JSON.stringify(queryJson),
        }).unwrap();
        dispatch(addToast("Smart folder updated", "success"));
      } else {
        const result = await createSmartFolder({
          name: trimmed,
          queryJson: JSON.stringify(queryJson),
        }).unwrap();
        navigate(`/search?smartFolder=${result.id}`);
      }
      onClose();
    } catch {
      dispatch(addToast("Failed to save smart folder", "error"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit Smart Folder" : "New Smart Folder"}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Active Tasks"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Text search
          </label>
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Optional keyword filter"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tag filter
          </label>
          <input
            type="text"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="e.g. javascript"
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {editing ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
